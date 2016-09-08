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
});
setInterval(function() {
  if (socket.connected) {
    var number = Math.random();
    console.log('Sockets: Echoing server', number);
    socket.emit('echo', number);
  }
}, 1000);

