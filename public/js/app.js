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
      height = window.innerHeight; // default height

  var nodes = [], links = [], indexMap = {}, mentionCount = 0;

  var canvas = d3.select('body').append('canvas')
      .attr('width', width)
      .attr('height', height);
   var context = canvas.node().getContext("2d");

  // build zoom functionality over an entire rectangle not just parts of the graph.
  var zoom = d3.behavior.zoom().scaleExtent([1, 5]).on('zoom', function () {
    console.log(d3.event, this);
    graph_container.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
  });

  // build force layout
  var force = d3.layout.force()
      .charge(-120)
      .linkDistance(30)
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
      image: tweet.actor.image,
      text: tweet.body,
      summary: tweet.actor.summary
    };

    if (tweet.twitter_entities.user_mentions.length === 0) { return; }

    var mentions = tweet.twitter_entities.user_mentions.map(function (m) {
      return {name: m.screen_name, displayName: m.name, image: '/img/empty.png', id: m.id};
    });

    if (! indexMap[user.id]) {
      nodes.push(user);
      indexMap[user.id] = { index: nodes.length - 1, links: [] };
    } else {
      if (nodes[indexMap[user.id].index].image === '/img/empty.png') {
        // we have new info for this user.
        nodes[indexMap[user.id].index].image = user.image;
        nodes[indexMap[user.id].index].summary = user.summary;
        nodes[indexMap[user.id].index].text = tweet.body;
      }
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
        console.log(new Date() + 'pushing link between ' + indexMap[user.id].index + ' and ' + indexMap[m.id].index + '. ids: ' + [user.id, m.id]);
      } else {
        console.log('self-link or existing link detected between ' + indexMap[user.id].index + ' and ' + indexMap[m.id].index + '. ids: ' + [user.id, m.id]);
      }
      force
        .nodes(nodes)
        .links(links)
        .start();
    }
  });

  function tick() {
    context.clearRect(0, 0, width, height);

    // draw links
    context.strokeStyle = "#ccc";
    context.beginPath();
    links.forEach(function(d) {
      context.moveTo(d.source.x, d.source.y);
      context.lineTo(d.target.x, d.target.y);
    });
    context.stroke();

    // draw nodes
    context.fillStyle = "steelblue";
    context.beginPath();
    nodes.forEach(function(d) {
      context.moveTo(d.x, d.y);
      context.arc(d.x, d.y, 4.5, 0, 2 * Math.PI);
    });
    context.fill();
  }
}());
