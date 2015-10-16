/* jshint -W097 */
/* global __dirname: false */

'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ps = require('powersocket');
var https = require('https');
var url = require('url');
var request = require('request');
var port = process.env.MENTION_PORT || 3000;

ps.Connection({
  url: process.env.POWERSOCKET_URL,
  onTweet: function(tweet) {
    io.sockets.emit('tweet', tweet);
  }
});


io.on('connection', function(socket) {
  console.log('Got a client');
  socket.on('config', function(config) {
    io.sockets.emit('config', config);
  });
});

app.use(express.static('public'));
app.use(express.static('bower_components'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/vis', function(req, res){
  res.sendFile(__dirname + '/vis.html');
});

app.get('/controls', function(req, res) { 
  res.sendFile(__dirname + '/controls.html');
});

app.get('/orbs', function(req, res) { 
  res.sendFile(__dirname + '/orbs.html');
});

app.get('/image', function(req, res) {
  var imgUrl = url.parse(req.query.q);
  request(imgUrl.href).pipe(res);
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});

