/* jshint -W097 */

'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ps = require('powersocket');

ps.configuration({
  url: process.env.POWERSOCKET_URL
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

