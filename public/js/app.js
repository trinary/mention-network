/*************************************
//
// powersocket app
//
**************************************/
/* global io: false */
/* global d3: false */
/* global window: false */
/* jshint -W015 */
/* jshint camelcase: false */

(function() {
  'use strict';

  // connect to our socket server
  var socket = io();
/*  var stats = new Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = window.innerWidth - 100 + 'px';
  stats.domElement.style.top = '0px';

  */

//  document.body.appendChild(stats.domElement);
  //
  //setup some common vars

  var updateConfig = function (config) {
      force
        .linkStrength(config.linkstrength)
        .friction(config.friction)
        .linkDistance(config.linkdistance)
        .charge(config.charge)
        .gravity(config.gravity)
        .start();
  };

  var extractGeo = function(tweet) {
    var lat, long, ret;
    if (tweet.location) {
      if (tweet.location.geo) { 
        if (tweet.location.geo.type === 'Polygon') {
          ret = { 
            lat: d3.mean(tweet.location.geo.coordinates[0], function(d) { return d[1]; }), 
            lng: d3.mean(tweet.location.geo.coordinates[0], function(d) { return d[0]; })
          };
          return ret;
        }
      }
    } else if (tweet.gnip.profileLocations) {
      if (tweet.gnip.profileLocations[0].geo.type == 'point') {
        ret = {
          lat: tweet.gnip.profileLocations[0].geo.coordinates[1],
          lng: tweet.gnip.profileLocations[0].geo.coordinates[0]
        };
        return ret;
      }
    }
    return undefined;
  };

  var imageScale = function(user) {
    var now = new Date();
    var diff = now - user.lastTweeted;
    if (diff < 1000) {
      return 1 + (diff / 1000);
    } else if (diff < 10000) {
      return 2;
    } else if (diff < 12000) {
      return 2 - ((diff - 10000) / 2000);
    } else {
      return 1;
    }
  };

  var handleClick = function() {
    var x = d3.mouse(this)[0];
    var y = d3.mouse(this)[1];

    var touchRadius = 24;
    var users = nodes.filter(function(d) { return Math.pow(x - d.x, 2) + Math.pow(y - d.y, 2) < 400; });
    if (users.length === 0) { 
      d3.select('#tweetdetails').transition()
        .style({'right':'-20%'})
        .each("end", function(d) {
          d3.select(this).html("");
        });
      return;
    }
    var user = users[0];

    var template = Handlebars.templates.tweetdetail(user);
    d3.select('#tweetdetails').html(template);
    d3.select('#tweetdetails').transition()
      .style({'right':'0%'});
    var marker = d3.select('#tweetdetails').select('canvas');
    var cx = marker.node().getContext('2d');
    if (user.loaded) {
      cx.drawImage(user.image, 0, 0, 24, 24);
    } else {
      cx.fillStyle = mentionColor;
      cx.arc(12, 12, 12, 2 * Math.PI, false);
      cx.fill();
    }

    if (user.geo) {
      var map = d3.select('canvas.tweet-map').attr({width: 320, height: 200});
      var c = map.node().getContext('2d');
      var projection = d3.geo.orthographic()
        .translate([160,100])
        .scale(248)
        .rotate(location)
        .clipAngle(90);
      var path = d3.geo.path()
        .projection(projection)
        .context(c);

      d3.transition()
        .duration(1500)
        .tween('rotate', function() {
          var r = d3.interpolate(projection.rotate(), [-user.geo.lng, -user.geo.lat]);
          return function(t) {
            projection.rotate(r(t));
            map.node().width = map.node().width;
            c.fillStyle = "#bbb"; c.beginPath(); path(land); c.fill();
            c.fillStyle = "#f00"; c.beginPath(); path(countries[i]); c.fill();
            c.strokeStyle = "#fff"; c.lineWidth = 0.5; c.beginPath(); path(borders); c.stroke();
            c.strokeStyle = "#000"; c.lineWidth = 2; c.beginPath(); path(globe); c.stroke();
          };
        })
        .transition()
        .each("end", function(d) {
          var projected = projection([user.geo.lng, user.geo.lat]);
          c.fillStyle = "#78c5ff";
          c.beginPath();
          c.arc(projected[0], projected[1], 8, 2 * Math.PI, false);
          c.fill();
          location = [-user.geo.lng, -user.geo.lat];
        });
    }
  };

  var nodes = [], links = [], indexMap = {}, mentionCount = 0, limit = 1000;

  d3.select('body').append('div')
      .classed('popcontainer', true);
  d3.select('body').append('div')
      .attr('id', 'tweetdetails');
  d3.select('body').append('canvas')
      .classed('main', true)
      .attr('width', window.innerWidth)
      .attr('height', window.innerHeight)
      .on('click', handleClick);

  var canvas = document.getElementsByTagName('canvas')[0];
  var context = canvas.getContext('2d');
  var mentionColor = "#1729A7";
  var location = [0,0];
  var globe, map, land, countries, borders;
  var i = -1;
  d3.json('js/world-110m.json', function(world) {
    globe = {type: "Sphere"};
    land = topojson.feature(world, world.objects.land);
    countries = topojson.feature(world, world.objects.countries).features;
    borders = topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; });
  });



  // build force layout
  var force = d3.layout.force()
      .size([window.innerWidth, window.innerHeight])
      .nodes(nodes)
      .links(links)
      .on('tick', tick);

  force.start();

  var processTweet = function (tweet) {
    var user;
    var id = +(tweet.actor.id.split(':')[2]);
    try {
      evict(nodes.length);
      if (! indexMap[id]) {
        user = {
          name: tweet.actor.preferredUsername,
          displayName: tweet.actor.displayName,
          id: +(tweet.actor.id.split(':')[2]),
          image: new Image(),
          tweet: tweet,
          summary: tweet.actor.summary,
          lastTweeted: new Date(),
          geo: extractGeo(tweet),
          loaded: false
        };
        user.image.src = "/image?q="+tweet.actor.image;
        user.image.onload = function() {
          if (user.loaded) { return;}
          var c = document.createElement("canvas");
          d3.select(c).attr({"width": 48, "height": 48});
          var cx = c.getContext("2d");
          cx.beginPath();
          cx.arc(24, 24, 24, 2 * Math.PI, false);
          cx.clip();
          cx.drawImage(this, 0,0, 48, 48);
          var lol = c.toDataURL();
          this.src = lol;
          user.loaded = true;
          createBox(user, tweet.twitter_entities.user_mentions);
        };
        nodes.push(user);
        indexMap[user.id] = { index: nodes.length - 1, links: [] };
      } else {
        nodes[indexMap[id].index].tweet = tweet;
        nodes[indexMap[id].index].lastTweeted = new Date();
      }

      if (tweet.twitter_entities.user_mentions.length === 0) { return; }

      var mentions = tweet.twitter_entities.user_mentions.map(function (m) {
        var mentioned = {
          name: m.screen_name,
          displayName: m.name,
          image: new Image(),
          id: m.id,
          loaded: false
        };

        return mentioned;
      });

      for (var i = 0; i < mentions.length; i++) {
        var m = mentions[i];
        mentionCount += 1;

        if (! indexMap[m.id]) {
          nodes.push(m);
          indexMap[m.id] = { index: nodes.length - 1, links: [] };
        }

        if (m.id !== id && indexMap[id].links.indexOf(m.id) === -1) {
          indexMap[id].links.push(m.id);
          links.push({source: nodes[indexMap[id].index], target: nodes[indexMap[m.id].index], value: 1 });
        }

        force
          .nodes(nodes)
          .links(links)
          .start();
      }
    } catch(e) {
      console.log('Error in tweet event handler: ' + e, e.stack);
    }
  };

  function clearEvict(nodeCount) {
    if (nodeCount > limit) {
      nodes = [];
      links = [];
      indexMap = {};
    }
  }

  function createBox(node, mentions) {
    if (mentions.length === 0) { return; }
    var box = d3.select('.popcontainer').insert('div', ':first-child').classed('node', true);
    var marker = box.append('canvas')
      .classed('marker', true)
      .attr({
        'width': 24,
        'height': 24
      });

    var cx = marker.node().getContext('2d');
    cx.drawImage(node.image, 0, 0, 24, 24);
    box.append('p')
      .classed('note', true)
      .text(node.name);

    box
      .transition()
      .delay(5000)
      .style('opacity', 0)
      .remove();
  }

  function evict(nodeCount) { clearEvict(nodeCount); }

  function tick() {
//    stats.begin();
    var clipList = [];
    canvas.width = canvas.width;

    // draw links
    context.strokeStyle = '#ccc';
    context.beginPath();
    links.forEach(function(d) {
      context.moveTo(~~d.source.x, ~~d.source.y);
      context.lineTo(~~d.target.x, ~~d.target.y);
    });
    context.stroke();

    // draw nodes
    context.beginPath();
    context.fillStyle = mentionColor;
    nodes.forEach(function(d) {
      var dx = Math.round(d.x);
      var dy = Math.round(d.y);
      context.moveTo(dx, dy);
      if (d.loaded) {
        try {
          var scale = imageScale(d);
          var size = 24 * scale;

          context.drawImage(d.image, dx-(size/2), dy-(size/2), size, size);
        } catch(e) {
          console.log("Error in drawImage(): " + e, e.stack);
        }
      } else {
        context.arc(dx, dy, 12, 2 * Math.PI, false);
      }
    });
    context.fill();
//    stats.end();
  }

  socket.on('tweet', processTweet);
  socket.on('config', updateConfig);
}());
