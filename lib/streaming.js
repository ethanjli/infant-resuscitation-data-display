module.exports = function(socketio, interval, sensors) {
  var streamTimer = null;
  var displayPanels = {};
  var controlPanels = {};
  var hardwareInteractionClients = {};
  var state = 'ready';

  // Client management
  function displayPanelsRoom() {
    return socketio.to('display-panel');
  }
  function controlPanelsRoom() {
    return socketio.to('control-panel');
  }
  function numDisplayPanels() {
    return Object.keys(displayPanels).length;
  }
  function numControlPanels() {
    return Object.keys(controlPanels).length;
  }
  function numHardwareInteractionClients() {
    return Object.keys(hardwareInteractionClients).length;
  }

  // Data Streaming
  function isStreaming() {
    return streamTimer !== null;
  }
  function startStreaming() {
      if (streamTimer !== null) {
        return;
      }
      console.log('[Streaming] Starting simulation.');
      state = 'running';
      controlPanelsRoom().emit('start');
      streamTimer = setInterval(streamNext, interval);
  }
  function stopStreaming() {
      if (streamTimer === null) {
        return;
      }
      console.log('[Streaming] Stopping simulation.');
      state = 'stopped';
      controlPanelsRoom().emit('stop');
      clearInterval(streamTimer);
      streamTimer = null;
  }
  function resetStreaming() {
      stopStreaming();
      console.log('[Streaming] Resetting simulation.');
      state = 'ready';
      sensors.reset();
      controlPanelsRoom().emit('reset');
      controlPanelsRoom().emit('sensor-connection', sensors.getSensorConnection())
      controlPanelsRoom().emit('spO2', sensors.getSpO2());
      controlPanelsRoom().emit('spO2-noise', sensors.getSpO2Noise());
      controlPanelsRoom().emit('fiO2', sensors.getFiO2());
      displayPanelsRoom().emit('reset', {
        time: 0,
        spO2: NaN,
        fiO2: 0,
      });
  }
  function streamNext() {
      var data = sensors.sampleNext();
      if (data !== null) {
        displayPanelsRoom().emit('update', data);
      }
  }

  // Control
  function setSensorConnection(sensorConnection) {
    if (sensorConnection) {
      console.log('[Streaming] Sensors are now connected.');
    } else {
      console.log('[Streaming] Sensors are now disconnected.');
    }
    sensors.setSensorConnection(sensorConnection);
    controlPanelsRoom().emit('sensor-connection', sensorConnection);
  }
  function setSpO2(spO2) {
    console.log('[Streaming] Updating SpO2 to ' + spO2);
    sensors.setSpO2(spO2);
    controlPanelsRoom().emit('spO2', spO2);
  }
  function setSpO2Noise(spO2Noise) {
    console.log('[Streaming] Updating SpO2 noise range to +/- ' + spO2Noise);
    sensors.setSpO2Noise(spO2Noise);
    controlPanelsRoom().emit('spO2-noise', spO2Noise);
  }
  function setFiO2(fiO2) {
    if (sensors.getFiO2() !== fiO2) {
      console.log('[Streaming] Updating FiO2 to ' + fiO2);
      sensors.setFiO2(fiO2);
      controlPanelsRoom().emit('fiO2', fiO2);
      displayPanelsRoom().volatile.emit('fiO2', fiO2);
    }
  }

  // Public interface
  return {
    // Management of clients
    addDisplayPanel: function(socket) {
      displayPanels[socket.id] = socket;
      socket.emit('initialize', sensors.sampleAllPrevious());
      socket.emit('fiO2', sensors.getFiO2());
      controlPanelsRoom().emit('display-connection-info', numDisplayPanels());
    },
    addControlPanel: function(socket) {
      controlPanels[socket.id] = socket;
      socket.emit('display-connection-info', numDisplayPanels());
      socket.emit('hardware-connection-info', numHardwareInteractionClients());
      socket.emit('sensor-connection', sensors.getSensorConnection());
      socket.emit('simulation-state-info', state);
      socket.emit('spO2', sensors.getSpO2());
      socket.emit('spO2-noise', sensors.getSpO2Noise());
      socket.emit('fiO2', sensors.getFiO2());
      socket.on('start', startStreaming);
      socket.on('reset', resetStreaming);
      socket.on('stop', stopStreaming);
      socket.on('sensor-connection', setSensorConnection);
      socket.on('spO2', setSpO2);
      socket.on('spO2-noise', setSpO2Noise);
      socket.on('fiO2', setFiO2);
      controlPanelsRoom().emit('control-connection-info', numControlPanels());
    },
    addHardwareInteractionClient: function(socket) {
      hardwareInteractionClients[socket.id] = socket;
      socket.on('fiO2', setFiO2);
      controlPanelsRoom().emit('hardware-connection-info', numHardwareInteractionClients());
    },
    removeDisplayPanel: function(socketId) {
      delete displayPanels[socketId];
      if (numDisplayPanels() === 0 && numControlPanels() === 0 && isStreaming()) {
        stopStreaming();
      }
      controlPanelsRoom().emit('display-connection-info', numDisplayPanels());
    },
    removeControlPanel: function(socketId) {
      delete controlPanels[socketId];
      if (numDisplayPanels() === 0 && numControlPanels() === 0 && isStreaming()) {
        stopStreaming();
      }
      controlPanelsRoom().emit('control-connection-info', numControlPanels());
    },
    removeHardwareInteractionClient: function(socketId) {
      delete hardwareInteractionClients[socketId];
      controlPanelsRoom().emit('hardware-connection-info', numHardwareInteractionClients());
    }
  };
}
