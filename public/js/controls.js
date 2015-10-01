

(function() {
  'use strict';

  var socket = io();

  function Params() {
    this.linkStrength = 0.1;
    this.friction = 0.9;
    this.linkDistance = 20;
    this.charge = -55;
    this.gravity = 0.1;
    this.theta = 0.8;
    this.alpha = 0.1;

    this.update = function() {
      socket.emit('config', this.object);
    };
  }

  var gui = new dat.GUI();
  var params = new Params();

  gui.add(params, 'linkStrength', 0, 10).onFinishChange(params.update);
  gui.add(params, 'friction', 0, 1).onFinishChange(params.update);
  gui.add(params, 'linkDistance', 0, 60).onFinishChange(params.update);
  gui.add(params, 'charge', -120, 30).onFinishChange(params.update);
  gui.add(params, 'gravity', 0, 1).onFinishChange(params.update);

}());
