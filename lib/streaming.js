module.exports = function(socketio, interval, sensors) {
  var streamTimer = null;
  var displayPanels = {};
  var controlPanels = {};
  return {
    // Management of clients
    addDisplayPanel: function(socket) {
      displayPanels[socket.id] = socket;
      socket.emit('initialize', sensors.sampleAllPrevious());
      if (Object.keys(displayPanels).length === 1) {
        this.startStreaming();
      }
    },
    addControlPanel: function(socket) {
      controlPanels[socket.id] = socket;
      socket.emit('initialize', 'previously-generated data');
    },
    removeDisplayPanel: function(socketId) {
      delete displayPanels[socketId];
      if (Object.keys(displayPanels).length === 0) {
        this.stopStreaming();
        sensors.reset();
      }
    },
    removeControlPanel: function(socketId) {
      delete controlPanels[socketId];
    },

    // Data streaming
    streamDelayInterval: interval,
    displayPanelsRoom: socketio.to('display-panel'),
    startStreaming: function() {
      streamTimer = setInterval(this.streamNext.bind(this), this.streamDelayInterval);
    },
    streamNext: function() {
      var data = sensors.sampleNext();
      if (data !== null) {
        console.log('[Streaming] Streaming next data sample at time ' + data.time);
        this.displayPanelsRoom.emit('update', data);
      }
    },
    stopStreaming: function() {
      if (streamTimer) {
        clearInterval(streamTimer);
        streamTimer = null;
      }
    }
  };
}
