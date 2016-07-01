module.exports = function(socketio, interval, sensors) {
  var streamTimer = null;
  var displayPanels = {};
  var controlPanels = {};
  var displayPanelsRoom = socketio.to('display-panel');
  var controlPanelsRoom = socketio.to('control-panel');

  function numDisplayPanels() {
    return Object.keys(displayPanels).length;
  }
  function numControlPanels() {
    return Object.keys(controlPanels).length;
  }
  function isStreaming() {
    return streamTimer !== null;
  }

  return {
    // Management of clients
    addDisplayPanel: function(socket) {
      displayPanels[socket.id] = socket;
      socket.emit('initialize', sensors.sampleAllPrevious());
      if (numDisplayPanels() === 1 && !isStreaming()) {
        this.startStreaming();
      }
      controlPanelsRoom.emit('display-connection-info', numDisplayPanels());
    },
    addControlPanel: function(socket) {
      controlPanels[socket.id] = socket;
      socket.emit('display-connection-info', numDisplayPanels());
      socket.on('reset', this.resetStreaming.bind(this));
      controlPanelsRoom.emit('control-connection-info', numControlPanels());
    },
    removeDisplayPanel: function(socketId) {
      delete displayPanels[socketId];
      if (numDisplayPanels() === 0 && numControlPanels() === 0 && isStreaming()) {
        this.stopStreaming();
        sensors.reset();
      }
      controlPanelsRoom.emit('display-connection-info', numDisplayPanels());
    },
    removeControlPanel: function(socketId) {
      delete controlPanels[socketId];
      if (numDisplayPanels() === 0 && numControlPanels() === 0 && isStreaming()) {
        this.stopStreaming();
        sensors.reset();
      }
      controlPanelsRoom.emit('control-connection-info', numControlPanels());
    },

    // Data streaming
    streamDelayInterval: interval,
    startStreaming: function() {
      streamTimer = setInterval(this.streamNext.bind(this), this.streamDelayInterval);
    },
    stopStreaming: function() {
      if (streamTimer) {
        clearInterval(streamTimer);
        streamTimer = null;
      }
    },
    streamNext: function() {
      var data = sensors.sampleNext();
      if (data !== null) {
        //console.log('[Streaming] Streaming next data sample at time ' + data.time);
        displayPanelsRoom.emit('update', data);
      }
    },
    resetStreaming: function() {
      console.log('[Streaming] Resetting.');
      sensors.reset();
      this.stopStreaming();
      displayPanelsRoom.emit('reset');
      this.startStreaming();
    }
  };
}
