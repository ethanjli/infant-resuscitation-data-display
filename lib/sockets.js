module.exports.connection = function(socket) {
  console.log('A new client connected!');
  socket.emit('update', {
    time: '00:10',
    spo2: 0.42,
    fio2: 0.20,
  });
  socket.on('connected', function(data) {
    console.log('The client that connected is a ' + data.client + '.');
  });
}
