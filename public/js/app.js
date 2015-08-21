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
  //
  //setup some common vars
  var width = window.innerWidth, // default width
      height = window.innerHeight, // default height
      limit = 30,
      nodes = [], links = [], indexMap = {}, mentionCount = 0, images = {};

    d3.select('body').append('canvas')
      .attr('width', width)
      .attr('height', height);

  var canvas = document.getElementsByTagName("canvas")[0];
  var context = canvas.getContext("2d");

  // build force layout
  var force = d3.layout.force()
      .nodes(nodes)
      .links(links)
      .size([width, height])
      .on('tick', tick)
      .start();

  socket.on('tweet', function (tweet) {
    var user = {
      name: tweet.actor.preferredUsername,
      displayName: tweet.actor.displayName,
      id: +(tweet.actor.id.split(':')[2]),
      image: new Image(),
      text: tweet.body,
      summary: tweet.actor.summary,
      loaded: false
    };

    user.image.src = tweet.actor.image;
    user.image.onload = function() { 
      user.loaded = true;
      tick();
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

    evict();

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
  });

  function evict() {
    var randomIndex, randomUser, keys = Object.keys(indexMap);


    while(nodes.length > limit) {
      debugger;
      randomIndex = ~~(Math.random() * nodes.length);
      console.log(nodes.length, randomIndex);
      if(randomIndex > 1) { 
        delete indexMap[nodes[randomIndex].id];
        nodes = d3.merge([nodes.slice(0,randomIndex), nodes.slice(randomIndex + 1, nodes.length)]);
      }
    }
  }

  function tick() {
    canvas.width = canvas.width;

    // draw links
    context.strokeStyle = "#ccc";
    context.beginPath();
    links.forEach(function(d) {
      context.moveTo(~~d.source.x, ~~d.source.y);
      context.lineTo(~~d.target.x, ~~d.target.y);
    });
    context.stroke();

    // draw nodes
    context.beginPath();
    context.fillStyle = "#55acee";
    nodes.forEach(function(d) {
      context.moveTo(d.x, d.y);
      if (d.loaded) {
        context.drawImage(d.image, ~~d.x - 6, ~~d.y - 6, d.image.width * 0.25, d.image.height * 0.25);
      } else {
        context.rect(~~d.x - 6 , ~~d.y -6, 12, 12);
      }
    });
    context.fill();
  }
}());
