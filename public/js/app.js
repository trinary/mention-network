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
  stats.domElement.style.left = '0px';
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

  var nodes = [], links = [], indexMap = {}, mentionCount = 0, limit = 2000;

  d3.select('body').append('canvas')
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
      evict();
      var user = {
        name: tweet.actor.preferredUsername,
        displayName: tweet.actor.displayName,
        id: +(tweet.actor.id.split(':')[2]),
        image: new Image(),
        text: tweet.body,
        summary: tweet.actor.summary,
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
      console.log('Caught an error: ', e);
    }
  };

  function clearEvict() {
    if (nodes.length > limit) {
      nodes = [];
      links = [];
      indexMap = {};
    }
  }

  function evict() { clearEvict(); }

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
          context.drawImage(d.image, dx-8, dy-8, 16, 16);
        } catch(e) {
          console.log(e);
        }
      } else {
        context.arc(dx, dy, 8, 2 * Math.PI, false);
      }
    });
    context.fill();
    context.restore();
    stats.end();
  }

  socket.on('tweet', processTweet);
  socket.on('config', updateConfig);
}());
