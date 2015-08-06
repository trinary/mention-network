/* jshint -W097 */

'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ps = require('powersocket');

ps.configuration({
  username: process.env.POWERSOCKET_USER,
  password: process.env.POWERSOCKET_PASS,
  path: process.env.POWERSOCKET_PATH
});

ps.callback(function(tweet) {
  io.sockets.emit('tweet', tweet);
});

app.use(express.static('public'));
app.use(express.static('bower_components'));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});

