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

  var svg = d3.select('body').append('svg')
      .attr('width', width)
      .attr('height', height);

  var graph_container = svg.append('g').classed('graph_container', true);

  // build zoom functionality over an entire rectangle not just parts of the graph.
  var zoom = d3.behavior.zoom().scaleExtent([1, 5]).on('zoom', function () {
    console.log(d3.event, this);
    graph_container.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
  });

  svg.append('rect').classed('zoom_container', true)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width)
    .attr('height', height)
    .call(zoom);

  var link_container = graph_container.append('g').classed('link_container', true);
  var node_container = graph_container.append('g').classed('node_container', true);
  var data_container = svg.append('g').classed('data_container', true);

  // build data text on top right of screen
  data_container.append('text')
    .attr('id', 'mentiontext')
    .attr('dy', 50)
    .attr('dx', width * 0.9)
    .text('Mentions: 0');

  //data_container.append('text')
  //  .attr('id','linkstext')
  //  .attr('dy', 90)
  //  .attr('dx', width * 0.9)
  //  .text('Distinct Links: 0');


  //data_container.append('text')
  //  .attr('id','usercounttext')
  //  .attr('dy', 130)
  //  .attr('dx', width * 0.9)
  //  .text('Total Users: 0');

  data_container.append('text')
    .attr('id', 'usercounttext')
    .attr('dy', 90)
    .attr('dx', width * 0.9)
    .text('Users: 0');

  data_container.append('text')
    .attr('id', 'LIVE')
    .attr('dy', height * 0.95)
    .attr('dx', 30);


  // build mouseover w/ user profile name and summary
  var mouseover_container = svg.append('g').classed('mouseovercontainer', true);
  mouseover_container.attr('transform', 'translate(20,20)');

  // build force layout
  var node = node_container.selectAll('.node');

  var link = link_container.selectAll('.link');

  var force = d3.layout.force()
      .charge(-120)
      .linkDistance(30)
      .nodes(nodes)
      //.gravity(0.2)
      .links(links)
      .size([width, height])
      .on('tick', tick);

  // set hieights based on window size.
  window.onresize = function () {
    width = window.innerWidth; // default width
    height = window.innerHeight; // default height
    svg.attr('width', width)
      .attr('height', height);

    force.size([width, height]);
    force.start();
    data_container.attr('dx', width * 0.5);
    d3.select('#mentiontext').attr('dx', width * 0.9);
    d3.select('#usercounttext').attr('dx', width * 0.9);
    d3.select('#LIVE').attr('dx', width * 0.59);
  };

  //SOCKET STUFF
  function mouseover(d) {
    var container = d3.select('.mouseovercontainer');
    console.log(d, container);
    container.append('image')
      .attr('xlink:href', d.image)
      .attr('width', 48)
      .attr('height', 48)
      .attr('x', 12)
      .attr('y', 12);
    container.append('text')
      .classed('username', true)
      .attr('dx', 64)
      .attr('dy', 36)
      .text('@' + d.name);
    if (d.summary) {
      container.append('text')
        .classed('summary', true)
        .attr('dx', 64)
        .attr('dy', 60)
        .text(' ' + d.summary);
    }
  }

  function mouseout() {
    d3.selectAll('.mouseovercontainer *').remove();
  }

  function click(d) {
    var win = window.open('https://twitter.com/' + d.name, '_blank');
    win.focus();
  }

  function draw() {
    d3.select('#mentiontext').text('Mentions: ' + mentionCount);
    d3.select('#usercounttext').text('Users: ' + nodes.length);
    d3.select('#linkstext').text('Distinct Links: ' + links.length);

    link = link.data(force.links(), function (d) { return '' + d.source.id + ' ' + d.target.id; });
    link.enter().append('line')
        .attr('class', 'link')
        .style('stroke', '#333')
        .style('stroke-width', 2);
    link.exit().remove();

    node = node.data(force.nodes(), function (d) { return d.id; });
    node.enter().append('g')
        .attr('class', 'node')
        .append('image')
        .attr('x', -8)
        .attr('y', -8)
        .attr('width', 16)
        .attr('height', 16)
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        .on('click', click);

    node.select('image')
      .attr('xlink:href', function (d) { return d.image; });
    node.exit().remove();

    force.start();
  }

  socket.on('tweet', function (tweet) {
    var user = {
      name: tweet.actor.preferredUsername,
      displayName: tweet.actor.displayName,
      id: +(tweet.actor.id.split(':')[2]),
      image: tweet.actor.image,
      text: tweet.body,
      summary: tweet.actor.summary
    };

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
    }
    draw();
  });

  function tick() {
    link.attr('x1', function (d) { return d.source.x; })
        .attr('y1', function (d) { return d.source.y; })
        .attr('x2', function (d) { return d.target.x; })
        .attr('y2', function (d) { return d.target.y; });

    node.attr('transform', function (d) { return 'translate(' + [d.x, d.y] + ')'; });
  }
}());
