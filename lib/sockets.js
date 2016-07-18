module.exports = function(streaming) {
  return {
    connection: function(socket) {
      var clientType = null;

      console.log('[Sockets] Connection: ' + socket.id);

      socket.on('echo', function(data) {
        console.log('[Sockets] Echo from ' + socket.id, data);
        socket.emit('echo', data);
      });
      socket.on('connected', function(data) {
        clientType = data.client;
        socket.join(clientType);
        if (clientType === 'display-panel') {
          console.log('[Sockets] Display Panel Initialization: ' + socket.id);
          streaming.addDisplayPanel(socket);
        } else if (clientType === 'control-panel') {
          console.log('[Sockets] Control Panel Initialization: ' + socket.id);
          streaming.addControlPanel(socket);
        }
      });
      socket.on('disconnect', function(data) {
        console.log('[Sockets] Disconnection: ' + socket.id);
        if (clientType === 'display-panel') {
          streaming.removeDisplayPanel(socket.id);
        } else if (clientType === 'control-panel') {
          streaming.removeControlPanel(socket.id);
        }
      });
    }
  }
};
