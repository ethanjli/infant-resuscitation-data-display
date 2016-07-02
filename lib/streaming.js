module.exports = function(socketio, interval, sensors) {
  var streamTimer = null;
  var displayPanels = {};
  var controlPanels = {};
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
      controlPanelsRoom().emit('spO2', sensors.spO2);
      controlPanelsRoom().emit('spO2-noise', sensors.spO2Noise);
      controlPanelsRoom().emit('fiO2', sensors.fiO2);
      displayPanelsRoom().emit('reset', {
        time: 0,
        spO2: NaN,
        fiO2: NaN,
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
    console.log('[Streaming] Updating SpO2 noise range to +/- ' + spO2);
    sensors.setSpO2Noise(spO2Noise);
    controlPanelsRoom().emit('spO2-noise', spO2Noise);
  }
  function setFiO2(fiO2) {
    console.log('[Streaming] Updating FiO2 to ' + fiO2);
    sensors.setFiO2(fiO2);
    controlPanelsRoom().emit('fiO2', fiO2);
  }

  // Public interface
  return {
    // Management of clients
    addDisplayPanel: function(socket) {
      displayPanels[socket.id] = socket;
      socket.emit('initialize', sensors.sampleAllPrevious());
      controlPanelsRoom().emit('display-connection-info', numDisplayPanels());
    },
    addControlPanel: function(socket) {
      controlPanels[socket.id] = socket;
      socket.emit('display-connection-info', numDisplayPanels());
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
    removeDisplayPanel: function(socketId) {
      delete displayPanels[socketId];
      if (numDisplayPanels() === 0 && numControlPanels() === 0 && isStreaming()) {
        stopStreaming();
        sensors.reset();
      }
      controlPanelsRoom().emit('display-connection-info', numDisplayPanels());
    },
    removeControlPanel: function(socketId) {
      delete controlPanels[socketId];
      if (numDisplayPanels() === 0 && numControlPanels() === 0 && isStreaming()) {
        stopStreaming();
        sensors.reset();
      }
      controlPanelsRoom().emit('control-connection-info', numControlPanels());
    },

  };
}
