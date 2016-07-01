var sensors = require('./sensors');

module.exports = function(sensors) {
  function initializeDisplayPanel(socket, sensors) {
    console.log('[Sockets] Display Panel Initialization: ' + socket.id);
    socket.emit('initialize', sensors);
    sensors.addDisplayPanel(socket);
  }

  function initializeControlPanel(socket, sensors) {
    console.log('[Sockets] Control Panel Initialization: ' + socket.id);
    socket.emit('initialize', sensors);
    sensors.addControlPanel(socket);
  }

  return {
    connection: function(socket) {
      var clientType = null;

      console.log('[Sockets] Connection: ' + socket.id);

      socket.on('connected', function(data) {
        clientType = data.client;
        if (clientType === 'display-panel') {
          initializeDisplayPanel(socket, sensors);
        } else if (clientType === 'control-panel') {
          initializeControlPanel(socket, sensors);
        }
      });
      socket.on('disconnect', function(data) {
        console.log('[Sockets] Disconnection: ' + socket.id);
        if (clientType === 'display-panel') {
          sensors.removeDisplayPanel(socket.id);
        } else if (clientType === 'control-panel') {
          sensors.removeControlPanel(socket.id);
        }
      });
    }
  }
}(sensors);
