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
  var stats = new Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = window.innerWidth - 100 + 'px';
  stats.domElement.style.top = '0px';

  document.body.appendChild(stats.domElement);
  //
  //setup some common vars

  var nextCol = 1;
  function genColor(){
    var ret = [];
    // via http://stackoverflow.com/a/15804183
    if(nextCol < 16777215){
      ret.push(nextCol & 0xff); // R
      ret.push((nextCol & 0xff00) >> 8); // G 
      ret.push((nextCol & 0xff0000) >> 16); // B

      nextCol += 1;
    }
    var col = 'rgb(' + ret.join(',') + ')';
    return col;
  }

  var updateConfig = function (config) {
      force
        .linkStrength(config.linkstrength)
        .friction(config.friction)
        .linkDistance(config.linkdistance)
        .charge(config.charge)
        .gravity(config.gravity);
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

  var nodes = [], links = [], indexMap = {}, mentionCount = 0, limit = 2000;

  d3.select('body').append('div')
      .classed('popcontainer', true);
  d3.select('body').append('canvas')
      .classed('main', true)
      .attr('width', window.innerWidth)
      .attr('height', window.innerHeight);

  var canvas = document.getElementsByTagName('canvas')[0];
  var context = canvas.getContext('2d');
  var onloadcount = 0;

  // build force layout
  var force = d3.layout.force()
      .size([window.innerWidth, window.innerHeight])
      .nodes(nodes)
      .links(links)
      .on('tick', tick);

  force.start();

  var processTweet = function (tweet) {
    try {
      evict(nodes.length);
      var user = {
        name: tweet.actor.preferredUsername,
        displayName: tweet.actor.displayName,
        id: +(tweet.actor.id.split(':')[2]),
        image: new Image(),
        text: tweet.body,
        summary: tweet.actor.summary,
        lastTweeted: new Date(),
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

      if (! indexMap[user.id]) {
        nodes.push(user);
        indexMap[user.id] = { index: nodes.length - 1, links: [] };
      } else {
        nodes[indexMap[user.id].index].image = user.image;
        nodes[indexMap[user.id].index].summary = user.summary;
        nodes[indexMap[user.id].index].text = tweet.body;
        nodes[indexMap[user.id].index].lastTweeted = new Date();
      }

      for (var i = 0; i < mentions.length; i++) {
        var m = mentions[i];
        mentionCount += 1;

        if (! indexMap[m.id]) {
          nodes.push(m);
          indexMap[m.id] = { index: nodes.length - 1, links: [] };
        }

        if (m.id !== user.id && indexMap[user.id].links.indexOf(m.id) === -1) {
          indexMap[user.id].links.push(m.id);
          links.push({source: nodes[indexMap[user.id].index], target: nodes[indexMap[m.id].index], value: 1 });
        }

        force
          .nodes(nodes)
          .links(links)
          .start();
      }
    } catch(e) {
      console.log('Caught an error: ' + e, e.stack);
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
    var box = d3.select('.popcontainer').append('div').classed('node', true);
    var marker = box.append('canvas')
      .classed('marker', true)
      .attr({
        'width': 24,
        'height': 24
      });

    var cx = marker[0][0].getContext('2d');
    console.log(node);
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
    stats.begin();
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
    context.fillStyle = '#34ffe9';
    nodes.forEach(function(d) {
      var dx = ~~d.x;
      var dy = ~~d.y;
      context.moveTo(dx, dy);
      if (d.loaded) {
        try {
          var scale = imageScale(d);
          var size = 24 * scale;
          context.drawImage(d.image, dx-(size/2), dy-(size/2), size, size);
        } catch(e) {
          console.log(e);
        }
      } else {
        context.arc(dx, dy, 12, 2 * Math.PI, false);
      }
    });
    context.fill();
    context.restore();
    stats.end();
  }

  socket.on('tweet', processTweet);
  socket.on('config', updateConfig);
}());
