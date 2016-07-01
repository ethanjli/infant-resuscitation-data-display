module.exports = {
  displayPanels: {},
  controlPanels: {},
  addDisplayPanel: function(socket) {
    this.displayPanels[socket.id] = socket;
  },
  addControlPanel: function(socket) {
    this.controlPanels[socket.id] = socket;
  },
  removeDisplayPanel: function(socketId) {
    delete this.displayPanels[socketId];
  },
  removeControlPanel: function(socketId) {
    delete this.controlPanels[socketId];
  }
}
