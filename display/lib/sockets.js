module.exports = function(streaming) {
  return {
    connection: function(socket) {
      var client = null;

      console.log('[Sockets] Connection: ' + socket.id);

      socket.on('echo', function(data) {
        console.log('[Sockets] Echo from ' + socket.id, data);
        socket.emit('echo', data);
      });
      socket.on('connected', function(data) {
        client = data.client;
        var clientType = data.clientType;
        socket.join(client);
        if (client === 'display-panel') {
          console.log('[Sockets] Display Panel Initialization: ' + clientType + ' [' + socket.id + ']');
          streaming.addDisplayPanel(socket, clientType);
        } else if (client === 'control-panel') {
          console.log('[Sockets] Control Panel Initialization: ' + clientType + ' ['+ socket.id + ']');
          streaming.addControlPanel(socket, clientType);
        } else if (client === 'hardware-interaction-client') {
          console.log('[Sockets] Hardware Interaction Client Initialization: ' + clientType + ' ['+ socket.id + ']');
          streaming.addHardwareInteractionClient(socket, clientType);
        } else {
          console.log('[Sockets] Unknown client connected', client);
        }
      });
      socket.on('disconnect', function(data) {
        console.log('[Sockets] Disconnection: ' + socket.id);
        if (client === 'display-panel') {
          streaming.removeDisplayPanel(socket.id);
        } else if (client === 'control-panel') {
          streaming.removeControlPanel(socket.id);
        } else if (client == 'hardware-interaction-client') {
          streaming.removeHardwareInteractionClient(socket.id);
        } else {
          console.log('[Sockets] Unknown client disconnected', client);
        }
      });
    }
  }
};
