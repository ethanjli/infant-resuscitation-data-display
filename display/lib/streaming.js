var _ = require('lodash');
var moment = require('moment')

module.exports = function(socketio, ticksUntilStream, sensors) {
  var streamTimer = null;
  var untilStreamCounter = 0;
  var displayPanels = {};
  var controlPanels = {};
  var hardwareInteractionClients = {};
  var clients = {};
  var state = 'ready';
  var startTime = null;
  var events = [];

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
      if (startTime === null) {
        startTime = moment();
      }
      console.log('[Streaming] Starting simulation.');
      state = 'running';
      controlPanelsRoom().emit('start');
      streamTimer = setInterval(streamNext, 1000);
      logEvent({name: 'start-streaming'});
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
      logEvent({name: 'stop-streaming'});
  }
  function resetStreaming() {
      stopStreaming();
      console.log('[Streaming] Resetting simulation.');
      state = 'ready';
      events = [];
      sensors.reset();
      controlPanelsRoom().emit('reset');
      controlPanelsRoom().emit('sensor-connection', sensors.get('sensorConnection'));
      controlPanelsRoom().emit('spO2-mean', sensors.get('spO2Mean'));
      controlPanelsRoom().emit('spO2-noise', sensors.get('spO2Noise'));
      controlPanelsRoom().emit('fiO2', sensors.get('fiO2'));
      controlPanelsRoom().emit('hr', sensors.get('hr'));
      displayPanelsRoom().emit('reset', {
        time: 0,
        spO2Mean: NaN,
        spO2Noise: NaN,
        spO2: NaN,
        fiO2: 0.21,
        hr: NaN,
        sensorConnection: false,
        spO2Sensor: NaN,
        hrSensor: NaN
      });
      controlPanelsRoom().emit('tick', 0);
      startTime = null;
  }
  function streamNext() {
    if (untilStreamCounter === 0) {
      var data = sensors.sampleNext();
      if (data !== null) {
        displayPanelsRoom().emit('update', data);
        controlPanelsRoom().emit('tick', data.time);
      }
      untilStreamCounter = ticksUntilStream;
    } else {
      var time = sensors.tickNext();
      if (time !== null) {
        displayPanelsRoom().emit('tick', time);
        controlPanelsRoom().emit('tick', time);
      }
      untilStreamCounter--;
    }
  }

  // Control
  function setSensorConnection(sensorConnection) {
    if (sensorConnection) {
      console.log('[Streaming] Sensors are now connected.');
      logEvent({name: 'sensor-connection'});
    } else {
      console.log('[Streaming] Sensors are now disconnected.');
      logEvent({name: 'sensor-disconnection'});
    }
    sensors.setSensorConnection(sensorConnection);
    controlPanelsRoom().emit('sensor-connection', sensorConnection);
  }
  function setSpO2Mean(spO2Mean) {
    console.log('[Streaming] Updating SpO2 mean to ' + spO2Mean);
    sensors.setSpO2Mean(spO2Mean);
    controlPanelsRoom().emit('spO2-mean', spO2Mean);
  }
  function setSpO2Noise(spO2Noise) {
    console.log('[Streaming] Updating SpO2 noise range to +/- ' + spO2Noise);
    sensors.setSpO2Noise(spO2Noise);
    controlPanelsRoom().emit('spO2-noise', spO2Noise);
  }
  function setFiO2(fiO2) {
    if (sensors.get('fiO2') !== fiO2) {
      console.log('[Streaming] Updating FiO2 to ' + fiO2);
      sensors.setFiO2(fiO2);
      controlPanelsRoom().emit('fiO2', fiO2);
      displayPanelsRoom().volatile.emit('fiO2', fiO2);
    }
  }
  function setHR(hr) {
    if (sensors.get('hr') !== hr) {
      console.log('[Streaming] Updating HR to ' + hr);
      sensors.setHR(hr);
      controlPanelsRoom().emit('hr', hr);
      displayPanelsRoom().volatile.emit('hr', hr);
    }
  }
  function redirectClients(urlRedirect) {
    displayPanelsRoom().emit('redirect', urlRedirect);
  }

  // Event logging
  function logEvent(newEvent) {
    console.log('[Streaming] Logging event:', newEvent);
    events.push(_.assign(newEvent, {time: sensors.get('time')}));
  }

  // Public interface
  return {
    // Management of clients
    addDisplayPanel: function(socket, clientType) {
      displayPanels[socket.id] = socket;
      clients[socket.id] = clientType;
      socket.emit('initialize', sensors.sampleAllPrevious());
      socket.emit('fiO2', sensors.get('fiO2'));
      socket.emit('hr', sensors.get('hr'));
      socket.emit('tick', sensors.get('time'));
      controlPanelsRoom().emit('display-connection-info', numDisplayPanels());
    },
    addControlPanel: function(socket, clientType) {
      controlPanels[socket.id] = socket;
      clients[socket.id] = clientType;
      socket.emit('display-connection-info', numDisplayPanels());
      socket.emit('hardware-connection-info', numHardwareInteractionClients());
      socket.emit('simulation-state-info', state);
      socket.emit('sensor-connection', sensors.get('sensorConnection'));
      socket.emit('spO2-mean', sensors.get('spO2Mean'));
      socket.emit('spO2-noise', sensors.get('spO2Noise'));
      socket.emit('fiO2', sensors.get('fiO2'));
      socket.emit('hr', sensors.get('hr'));
      socket.emit('tick', sensors.get('time'));
      socket.on('start', startStreaming);
      socket.on('reset', resetStreaming);
      socket.on('stop', stopStreaming);
      socket.on('sensor-connection', setSensorConnection);
      socket.on('spO2-mean', setSpO2Mean);
      socket.on('spO2-noise', setSpO2Noise);
      socket.on('fiO2', setFiO2);
      socket.on('hr', setHR);
      socket.on('redirect', redirectClients);
      socket.on('event', logEvent);
      controlPanelsRoom().emit('control-connection-info', numControlPanels());
    },
    addHardwareInteractionClient: function(socket, clientType) {
      hardwareInteractionClients[socket.id] = socket;
      clients[socket.id] = clientType;
      socket.on('fiO2', setFiO2);
      socket.on('hr', setHR);
      controlPanelsRoom().emit('hardware-connection-info', numHardwareInteractionClients());
    },
    removeDisplayPanel: function(socketId) {
      delete displayPanels[socketId];
      delete clients[socketId];
      if (numDisplayPanels() === 0 && numControlPanels() === 0 && isStreaming()) {
        stopStreaming();
      }
      controlPanelsRoom().emit('display-connection-info', numDisplayPanels());
    },
    removeControlPanel: function(socketId) {
      delete controlPanels[socketId];
      delete clients[socketId];
      if (numDisplayPanels() === 0 && numControlPanels() === 0 && isStreaming()) {
        stopStreaming();
      }
      controlPanelsRoom().emit('control-connection-info', numControlPanels());
    },
    removeHardwareInteractionClient: function(socketId) {
      delete hardwareInteractionClients[socketId];
      delete clients[socketId];
      controlPanelsRoom().emit('hardware-connection-info', numHardwareInteractionClients());
    },
    getStartTime: function() {
      return startTime;
    },
    getEvents: function() {
      return events;
    },
    getClients: function() {
      return _.values(clients);
    }
  };
}
