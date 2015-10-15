(function() {
  'use strict';

  var socket = io();

  var update = function() {
    var container = d3.selectAll('.slider input');
    var state = {
    };
    container.each(function(d, i) { state[d.klass] = this.value; });
    if (! isDefault(state)) {
      socket.emit('config', state);
    }
  };

  var defaults = {
    linkstrength: 0.5,
    friction: 0.9,
    linkdistance: 20,
    charge: -55,
    gravity: 0.1
  };

  var params = [
    {
      klass: "linkstrength",
      name: "Link Strength",
      min: 0,
      max: 1,
      start: defaults.linkstrength,
      decimal: true,
      callback: update
    },
    {
      klass: "friction",
      name: "Friction",
      min: 0,
      max: 1,
      start: defaults.friction,
      decimal: true,
      callback: update
    },
    {
      klass: "linkdistance",
      name: "Link Distance",
      min: 1,
      max: 180,
      decimal: true,
      start: defaults.linkdistance,
      callback: update
    },
    {
      klass: "charge",
      name: "Charge",
      min: -80,
      max: 0,
      start: defaults.charge,
      callback: update
    },
    {
      klass: "gravity",
      name: "Gravity",
      min: 0,
      max: 1,
      start: defaults.gravity,
      decimal: true,
      callback: update
    },
  ];


  var isDefault = function(newState) {
    return _.isEqual(defaults, newState);
  };

  var sliders = d3.select('body').selectAll('.slider')
    .data(params);

  sliders
    .enter()
    .append('div')
    .attr('class', function(d,i) { return ['slider', d.klass].join(' ');})
    .append('label')
    .text(function(d,i) { return d.name; });

  sliders
    .append('input')
    .each(function(d,i) { 
      Powerange(this, d);
    });
}());
