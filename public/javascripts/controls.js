function PlaceholderElem() {
    this.value = 0;
}
PlaceholderElem.prototype.setAttribute = function() {}
PlaceholderElem.prototype.removeAttribute = function() {}

function AdjustableValue(options) {
    if (options.inputElem) this.inputElem = document.getElementById(options.inputElem);
    else this.inputElem = new PlaceholderElem();
    if (options.unitsElem) this.unitsElem = document.getElementById(options.unitsElem);
    else this.unitsElem = new PlaceholderElem();
    if (options.elem) this.elem = document.getElementById(options.elem);
    this.units = options.units;
    this.min = options.min;
    this.max = options.max;
    this.step = options.step;
    this.placeholder = options.placeholder;
    this.inputElem.min = options.min;
    this.inputElem.max = options.max;
    this.inputElem.step = options.step;
    this.inputElem.placeholder = options.placeholder;
    this.unitsElem.innerHTML = this.units.trim();
    this.socket = options.socket;
    this.messageName = options.messageName;
    this.updateMessage = options.updateMessage;
    if (this.socket) this.listen();
    this.monitor();
}
AdjustableValue.prototype.update = function(newValue, emit) {
    value = clamp(newValue, this.min, this.max);
    this.rawValue = newValue;
    this.inputElem.value = newValue;
    if (this.elem) this.elem.innerHTML = newValue + this.units;
    this.afterUpdate();
    if (emit) {
        this.inputElem.onchange();
    }
}
AdjustableValue.prototype.afterUpdate = function() {}
AdjustableValue.prototype.listen = function() {
    this.socket.on('connect', this.setWritable.bind(this));
    this.socket.on('disconnect', this.setReadOnly.bind(this));
    if (this.messageName) {
        this.socket.on(this.messageName, (function(newValue) {
            if (this.units === '%') newValue = Math.round(newValue * 100);
            this.update(newValue);
        }).bind(this));
    }
}
AdjustableValue.prototype.monitor = function() {
    this.inputElem.onchange = (function() {
        var value = this.getValue();
        if (this.units === '%') value /= 100;
        this.afterUpdate();
        if (this.socket && this.messageName) this.socket.emit(this.messageName, value);
    }).bind(this);
}
AdjustableValue.prototype.getValue = function() {
    var value = clamp(this.inputElem.value, this.min, this.max);
    return parseInt(value);
}
AdjustableValue.prototype.atMax = function() {
    return this.getValue() >= this.max;
}
AdjustableValue.prototype.atMin = function() {
    return this.getValue() <= this.min;
}
AdjustableValue.prototype.setReadOnly = function() {
    this.inputElem.setAttribute('readonly', 'readonly');
}
AdjustableValue.prototype.setWritable = function() {
    this.inputElem.removeAttribute('readonly');
}

var AutoAdjusterBehavior = new machina.BehavioralFsm({
    namespace: 'AutoAdjuster',
    initialState: 'ready',
    states: {
        ready: {
            _onEnter: function(client) {
                client.autoAdjustBtn.innerHTML = 'Start Adjusting';
            },
            reachedTarget: 'atTarget',
            clickTarget: 'adjusting',
            adjust: 'adjusting'
        },
        adjusting: {
            _onEnter: function(client) {
                client.autoAdjustBtn.innerHTML = 'Stop Adjusting';
                client.autoAdjustTimer = setInterval(client.adjust.bind(client),
                                                     1000 * client.timeStep);
            },
            _onExit: function(client) {
                clearTimeout(client.autoAdjustTimer);
            },
            reachedTarget: 'atTarget',
            clickTarget: 'ready',
            pause: 'paused'
        },
        paused: {
            _onEnter: function(client) {
                client.autoAdjustBtn.innerHTML = 'Paused';
                client.autoAdjustBtn.disabled = 'disabled';
            },
            _onExit: function(client) {
                client.autoAdjustBtn.disabled = '';
            },
            resume: 'adjusting',
            reset: 'ready'
        },
        atTarget: {
            _onEnter: function(client) {
                client.autoAdjustBtn.innerHTML = 'Start Adjusting';
                client.autoAdjustBtn.disabled = 'disabled'
            },
            _onExit: function(client) {
                client.autoAdjustBtn.disabled = '';
            },
            leftTarget: 'ready'
        }
    },
    updateValue: function(client) {
        if (client.getAdjustDirection() === 0) this.handle(client, 'reachedTarget');
        else this.handle(client, 'leftTarget');
    },
    clickTarget: function(client) {
        this.handle(client, 'clickTarget');
    },
    adjust: function(client) {
        this.handle(client, 'adjust');
    },
    reset: function(client) {
        this.handle(client, 'reset');
    },
    pause: function(client) {
        this.handle(client, 'pause');
    },
    resume: function(client) {
        this.handle(client, 'resume');
    }
});


function AutoAdjuster(options) {
    this.adjustableValue = options.adjustableValue;
    this.autoAdjustTargetValue = new AdjustableValue({
        inputElem: options.autoAdjustTargetInputElem,
        unitsElem: options.autoAdjustTargetUnitsElem,
        units: this.adjustableValue.units,
        min: this.adjustableValue.min,
        max: this.adjustableValue.max,
        step: this.adjustableValue.step,
        placeholder: this.adjustableValue.placeholder,
        socket: this.adjustableValue.socket
    });
    if (options.autoAdjustBtn) this.autoAdjustBtn = document.getElementById(options.autoAdjustBtn);
    else this.autoAdjustBtn = new PlaceholderElem();
    this.incrementStep = options.incrementStep;
    this.timeStep = options.timeStep;
    this.autoAdjustTimer = null;
    this.socket = this.adjustableValue.socket;
    this.listen();
    this.monitor();
}
AutoAdjuster.prototype.listen = function() {
    this.socket.on('reset', AutoAdjusterBehavior.reset.bind(AutoAdjusterBehavior, this));
    this.socket.on('stop', AutoAdjusterBehavior.pause.bind(AutoAdjusterBehavior, this));
    this.socket.on('start', AutoAdjusterBehavior.resume.bind(AutoAdjusterBehavior, this));
    this.socket.on('simulation-state-info', (function(data) {
        if (data === 'ready') AutoAdjusterBehavior.reset(this);
        else if (data === 'running') AutoAdjusterBehavior.resume(this);
        else if (data === 'stopped') AutoAdjusterBehavior.pause(this);
    }).bind(this));
}
AutoAdjuster.prototype.monitor = function() {
    this.adjustableValue.afterUpdate = AutoAdjusterBehavior.updateValue.bind(AutoAdjusterBehavior, this);
    this.autoAdjustTargetValue.afterUpdate = AutoAdjusterBehavior.updateValue.bind(AutoAdjusterBehavior, this);
    this.autoAdjustBtn.onclick = AutoAdjusterBehavior.clickTarget.bind(AutoAdjusterBehavior, this);
}
AutoAdjuster.prototype.adjust = function() {
    var value = this.adjustableValue.getValue();
    var direction = this.getAdjustDirection(value);
    var newValue = value + direction * this.incrementStep;
    if (this.getAdjustDirection(newValue) === 0 || this.getAdjustDirection(newValue) === -1 * direction) {
        newValue = this.autoAdjustTargetValue.getValue();
    }
    this.adjustableValue.update(newValue, true);
}
AutoAdjuster.prototype.getAdjustDirection = function(value) {
    if (value === undefined || value === null) value = this.adjustableValue.getValue();
    return Math.sign(this.autoAdjustTargetValue.getValue() - value);
}

var SimulationBehavior = new machina.BehavioralFsm({
    namespace: 'Simulation',
    initialState: 'ready',
    states: {
        ready: {
            _onEnter: function(client) {
                client.startResetBtn.innerHTML = 'Start';
                client.startResetBtn.disabled = '';
                client.pauseResumeBtn.innerHTML = 'Start at 00:10';
                client.pauseResumeBtn.disabled = '';
                client.downloadBtn.disabled = 'disabled';
            },
            _onExit: function(client) {
                client.startResetBtn.innerHTML = 'Reset';
                client.pauseResumeBtn.disabled = '';
                client.downloadBtn.disabled = '';
            },
            start: 'running',
            pause: 'paused',
            clickStartReset: function(client) {
                this.transition(client, 'waitingForResponse');
                client.socket.emit('start');
            },
            clickPauseResume: function(client) {
                this.transition(client, 'runningToPause');
                client.socket.emit('start');
            },
            disconnectSocket: 'waitingForResponse'
        },
        runningToPause: {
            _onEnter: function(client) {
                client.startResetBtn.innerHTML = 'Running until 00:10';
                client.startResetBtn.disabled = 'disabled';
                client.pauseResumeBtn.innerHTML = 'Pausing at 00:10';
                client.pauseResumeBtn.disabled = 'disabled';
                client.downloadBtn.disabled = 'disabled';
                client.runningToPause = true;
                console.log(client.runningToPause);
            },
            _onExit: function(client) {
                client.startResetBtn.innerHTML = 'Reset';
                client.startResetBtn.disabled = '';
                client.pauseResumeBtn.disabled = '';
                client.downloadBtn.disabled = '';
                client.runningToPause = false;
            },
            pause: 'paused',
            runningToPauseTimeout: function(client) {
                this.transition(client, 'waitingForResponse');
                client.socket.emit('stop');
            },
            disconnectSocket: 'waitingForResponse'
        },
        running: {
            reset: 'ready',
            pause: 'paused',
            clickStartReset: function(client) {
                this.transition(client, 'waitingForResponse');
                client.socket.emit('reset');
            },
            clickPauseResume: function(client) {
                this.transition(client, 'waitingForResponse');
                client.socket.emit('stop');
            },
            disconnectSocket: 'waitingForResponse'
        },
        paused: {
            _onEnter: function(client) {
                client.pauseResumeBtn.innerHTML = 'Resume';
            },
            _onExit: function(client) {
                client.pauseResumeBtn.innerHTML = 'Pause';
            },
            reset: 'ready',
            start: 'running',
            clickStartReset: function(client) {
                this.transition(client, 'waitingForResponse');
                client.socket.emit('reset');
            },
            clickPauseResume: function(client) {
                this.transition(client, 'waitingForResponse');
                client.socket.emit('start');
            },
            disconnectSocket: 'waitingForResponse'
        },
        waitingForResponse: {
            _onEnter: function(client) {
                client.startResetBtn.disabled = 'disabled';
                client.pauseResumeBtn.disabled = 'disabled';
                client.downloadBtn.disabled = 'disabled';
            },
            _onExit: function(client) {
                client.startResetBtn.disabled = '';
                client.pauseResumeBtn.disabled = '';
                client.downloadBtn.disabled = '';
            },
            reset: 'ready',
            start: 'running',
            pause: 'paused'
        }
    },
    reset: function(client) {
        this.handle(client, 'reset');
    },
    start: function(client) {
        this.handle(client, 'start');
    },
    pause: function(client) {
        this.handle(client, 'pause');
    },
    clickStartReset: function(client) {
        this.handle(client, 'clickStartReset');
    },
    clickPauseResume: function(client) {
        this.handle(client, 'clickPauseResume');
    },
    runningToPauseTimeout: function(client) {
        this.handle(client, 'runningToPauseTimeout');
    },
    disconnectSocket: function(client) {
        this.handle(client, 'disconnectSocket');
    }
});
function Simulation(options) {
    this.socket = options.socket;
    this.startResetBtn = document.getElementById(options.startResetBtn);
    this.pauseResumeBtn = document.getElementById(options.pauseResumeBtn);
    this.downloadBtn = document.getElementById(options.downloadBtn);
    this.initializationTime = options.initializationTime;
    this.runningToPause = false;

    this.listen();
    this.monitor();
}
Simulation.prototype.listen = function() {
    this.socket.on('start', (function() {
        console.log('Sockets: Starting simulation.');
        SimulationBehavior.start(this);
    }).bind(this));
    this.socket.on('reset', (function() {
        console.log('Sockets: Resetting simuluation.');
        SimulationBehavior.reset(this);
    }).bind(this));
    this.socket.on('stop', (function() {
        console.log('Sockets: Stopping simuluation.');
        SimulationBehavior.pause(this);
    }).bind(this));
    this.socket.on('simulation-state-info', (function(data) {
        console.log('Sockets: Simulation state is: ' + data);
        if (data === 'ready') SimulationBehavior.reset(this);
        else if (data === 'running') SimulationBehavior.start(this);
        else if (data === 'stopped') SimulationBehavior.pause(this);
    }).bind(this));
    this.socket.on('disconnect', SimulationBehavior.disconnectSocket.bind(SimulationBehavior, this));
    this.socket.on('tick', (function(time) {
        console.log(time, this.runningToPause);
        if (this.runningToPause && time >= this.initializationTime) {
            SimulationBehavior.runningToPauseTimeout(this);
        }
    }).bind(this));
}
Simulation.prototype.monitor = function() {
    this.startResetBtn.onclick = SimulationBehavior.clickStartReset.bind(SimulationBehavior, this);
    this.pauseResumeBtn.onclick = SimulationBehavior.clickPauseResume.bind(SimulationBehavior, this);
}

var SensorConnectionBehavior = new machina.BehavioralFsm({
    namespace: 'SensorConnection',
    initialState: 'disconnected',
    states: {
        disconnected: {
            _onEnter: function(client) {
                client.sensorConnectionBtn.innerHTML = 'Connect Sensors';
                client.sensorConnectionBtn.disabled = '';
                client.delayedSensorConnectionBtn.innerHTML = 'Schedule Connection in ' + client.delay + ' sec';
                client.delayedSensorConnectionBtn.disabled = '';
            },
            _onExit: function(client) {
                client.delayedSensorConnectionBtn.disabled = 'disabled'
            },
            connect: 'connected',
            clickDelayedConnect: 'waitingToConnect',
            clickConnectDisconnect: function(client) {
                this.transition(client, 'waitingForResponse');
                client.socket.emit('sensor-connection', true);
            },
            disconnectSocket: 'waitingForResponse'
        },
        waitingToConnect: {
            _onEnter: function(client) {
                client.sensorConnectionBtn.innerHTML = 'Connect Immediately';
                client.sensorConnectionBtn.disabled = '';
                client.delayedSensorConnectionBtn.disabled = '';
                client.timeUntilDelayedConnection = client.delay;
                client.delayedConnectionTimer = setInterval(client.countDownDelayedConnection.bind(client), 1000);
            },
            _onExit: function(client) {
                if (client.delayedConnectionTimer) clearInterval(client.delayedConnectionTimer);
            },
            connect: 'connected',
            disconnect: 'disconnected',
            clickConnectDisconnect: function(client) {
                this.transition(client, 'waitingForResponse');
                client.socket.emit('sensor-connection', true);
            },
            clickDelayedConnect: 'disconnected',
            delayedConnectionTimeout: function(client) {
                this.transition(client, 'waitingForResponse');
                client.socket.emit('sensor-connection', true);
            },
            disconnectSocket: 'waitingForResponse'
        },
        connected: {
            _onEnter: function(client) {
                client.sensorConnectionBtn.innerHTML = 'Disconnect Sensors';
                client.sensorConnectionBtn.disabled = '';
                client.delayedSensorConnectionBtn.innerHTML = 'Connected to Sensors';
                client.delayedSensorConnectionBtn.disabled = 'disabled';
            },
            _onExit: function(client) {
            },
            disconnect: 'disconnected',
            clickConnectDisconnect: function(client) {
                this.transition(client, 'waitingForResponse');
                client.socket.emit('sensor-connection', false);
            },
            disconnectSocket: 'waitingForResponse'

        },
        waitingForResponse: {
            _onEnter: function(client) {
                client.sensorConnectionBtn.disabled = 'disabled';
                client.delayedSensorConnectionBtn.disabled = 'disabled';
            },
            _onExit: function(client) {
                client.sensorConnectionBtn.disabled = '';
                client.delayedSensorConnectionBtn.disabled = '';
            },
            connect: 'connected',
            disconnect: 'disconnected'
        }
    },
    connect: function(client) {
        this.handle(client, 'connect');
    },
    disconnect: function(client) {
        this.handle(client, 'disconnect');
    },
    clickConnectDisconnect: function(client) {
        this.handle(client, 'clickConnectDisconnect');
    },
    clickDelayedConnect: function(client) {
        this.handle(client, 'clickDelayedConnect');
    },
    disconnectSocket: function(client) {
        this.handle(client, 'disconnectSocket');
    },
    delayedConnectionTimeout: function(client) {
        this.handle(client, 'delayedConnectionTimeout');
    }
});
function SensorConnection(options) {
    this.socket = options.socket;
    this.sensorConnectionBtn = document.getElementById(options.sensorConnectionBtn);
    this.delayedSensorConnectionBtn = document.getElementById(options.delayedSensorConnectionBtn);
    this.delay = options.delay;
    this.delayedConnectionTimer = null;
    this.timeUntilDelayedConnection = 0;
    this.listen();
    this.monitor();
}
SensorConnection.prototype.listen = function() {
    this.socket.on('sensor-connection', (function(data) {
        if (data) {
            console.log('Sockets: Connecting sensors.');
            SensorConnectionBehavior.connect(this);
        } else {
            console.log('Sockets: Disconnecting sensors.');
            SensorConnectionBehavior.disconnect(this);
        }
    }).bind(this));
    this.socket.on('disconnect', SensorConnectionBehavior.disconnectSocket.bind(SensorConnectionBehavior, this));
}
SensorConnection.prototype.monitor = function() {
    this.sensorConnectionBtn.onclick = SensorConnectionBehavior.clickConnectDisconnect.bind(SensorConnectionBehavior, this);
    this.delayedSensorConnectionBtn.onclick = SensorConnectionBehavior.clickDelayedConnect.bind(SensorConnectionBehavior, this);
}
SensorConnection.prototype.countDownDelayedConnection = function() {
    if (this.timeUntilDelayedConnection > 0) {
        this.delayedSensorConnectionBtn.innerHTML = 'Cancel Scheduled Connection (' + this.timeUntilDelayedConnection + ' sec left)';
        this.timeUntilDelayedConnection--;
        return;
    }
    SensorConnectionBehavior.delayedConnectionTimeout(this);
    this.delayedSensorConnectionBtn.innerHTML = 'Connecting now...';
}

function SocketConnection(options) {
    this.connectionStatusElem = document.getElementById(options.connectionStatusElem);
    this.displaysStatusElem = document.getElementById(options.displaysStatusElem);
    this.hardwareStatusElem = document.getElementById(options.hardwareStatusElem);
    this.socket = options.socket;
    this.listen();
}
SocketConnection.prototype.listen = function() {
    this.socket.on('connect', this.connected.bind(this));
    this.socket.on('control-connection-info', this.multipleConnected.bind(this));
    this.socket.on('display-connection-info', this.displaysConnected.bind(this));
    this.socket.on('hardware-connection-info', this.hardwareConnected.bind(this));
    this.socket.on('disconnect', this.disconnected.bind(this));
}
SocketConnection.prototype.connected = function() {
    this.multipleConnected(1);
    console.log('Sockets: Connected to server.');
    this.socket.emit('connected', {client: 'control-panel'});
}
SocketConnection.prototype.disconnected = function() {
    this.connectionStatusElem.innerHTML = 'Not connected to server';
    this.connectionStatusElem.className = 'label label-danger';
    console.log('Sockets: Disconnected from server.');
}
SocketConnection.prototype.multipleConnected = function(numControlPanels) {
    if (numControlPanels === 1) {
        this.connectionStatusElem.innerHTML = 'Connected to server';
        this.connectionStatusElem.className = 'label label-success';
        return;
    }
    this.connectionStatusElem.innerHTML = numControlPanels + ' control panels connected to server';
    this.connectionStatusElem.className = 'label label-info';
}
SocketConnection.prototype.displaysConnected = function(numDisplays) {
    if (numDisplays === 0) {
        this.displaysStatusElem.innerHTML = 'No display connected to server';
        this.displaysStatusElem.className = 'label label-warning';
        return;
    }
    if (numDisplays === 1) {
        this.displaysStatusElem.innerHTML = 'Display connected to server';
    } else {
        this.displaysStatusElem.innerHTML = numDisplays + ' displays connected to server';
    }
    this.displaysStatusElem.className = 'label label-success';
}
SocketConnection.prototype.hardwareConnected = function(numHardwareInterfaces) {
    if (numHardwareInterfaces === 0) {
        this.hardwareStatusElem.innerHTML = 'No hardware interface connected to server';
        this.hardwareStatusElem.className = 'label label-warning';
        return;
    }
    if (numHardwareInterfaces === 1) {
        this.hardwareStatusElem.innerHTML = 'Hardware interface connected to server';
    } else {
        this.hardwareStatusElem.innerHTML = numHardwareInterfaces + ' hardware interfaces connected to server';
    }
    this.hardwareStatusElem.className = 'label label-success';
}

function NRPTargets(options) {
    options.units = '%';
    options.min = 0;
    options.max = 1;
    options.missingString = 'N/A';
    this.minValue = new ReadableValue(_.assign(options, {elem: options.minElem}));
    this.maxValue = new ReadableValue(_.assign(options, {elem: options.maxElem}));
    this.midValue = new ReadableValue(_.assign(options, {elem: options.midElem}));
    this.socket = options.socket;
    this.messageName = 'tick';
    if (this.socket) this.listen();
}
NRPTargets.prototype.update = function(time) {
    var targetRange = getTargetRange(time);
    this.minValue.update(targetRange.lower);
    this.maxValue.update(targetRange.upper);
    this.midValue.update(targetRange.mid);
}
NRPTargets.prototype.listen = function() {
    this.socket.on(this.messageName, this.update.bind(this));
}

