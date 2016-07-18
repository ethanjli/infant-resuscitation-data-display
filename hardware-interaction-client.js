var five = require('johnny-five');

//var socket = require('socket.io-client')('http://stormy-refuge-48109.herokuapp.com')
var socket = require('socket.io-client')('http://localhost:5000');

socket.on('connect', function() {
  console.log('Sockets: Connected to server.');
  socket.emit('connected', {client: 'hardware-interaction-client'});
});
socket.on('disconnect', function() {
  console.log('Sockets: Disconnected from server.');
});
socket.on('reconnecting', function() {
  console.log('Sockets: Reconnecting to server...');
});
socket.on('reconnect_failed', function() {
  console.log('Sockets: Couldn\'nt reconnect to server.');
});
socket.on('echo', function(data) {
  console.log('Sockets: Echo from server', data);
})

var board = new five.Board();
var fiO2 = null

board.on('ready', function() {
  var fiO2Knob = new five.Sensor({
    pin: 'A0',
    freq: 100
  });
  fiO2Knob.on('data', function() {
    if (socket.connected) {
      var newFiO2 = (1 - this.value / 1023).toFixed(2);
      if (fiO2 !== newFiO2) {
        fiO2 = newFiO2;
        console.log(fiO2);
        socket.emit('fiO2', fiO2);
      }
    }
  });
})
