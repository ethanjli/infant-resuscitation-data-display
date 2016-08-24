function AdjustableValue(inputElemId, units, socket, messageName) {
    this.inputElem = document.getElementById(inputElemId);
    this.units = units;
    this.min = parseInt(this.inputElem.min);
    this.max = parseInt(this.inputElem.max);
    this.socket = socket;
    this.messageName = messageName;
}
AdjustableValue.prototype.update = function(newValue, emit) {
    value = clamp(newValue, this.min, this.max);
    this.inputElem.value = newValue;
    this.afterUpdate();
    if (emit) {
        this.inputElem.onchange();
    }
}
AdjustableValue.prototype.afterUpdate = function() {}
AdjustableValue.prototype.listen = function(updateMessage) {
    this.socket.on(this.messageName, (function(newValue) {
        console.log('Sockets: ' + updateMessage + newValue + '.');
        if (this.units === '%') newValue = Math.round(newValue * 100);
        this.update(newValue);
    }).bind(this));
}
AdjustableValue.prototype.monitor = function() {
    this.inputElem.onchange = (function() {
        var value = this.getValue();
        if (this.units === '%') value /= 100;
        this.afterUpdate();
        this.socket.emit(this.messageName, value);
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
    initialState: 'uninitialized',
    states: {
        uninitialized: {
            '*': function(client) {
                if (client.adjustableValue.atMax()) {
                    this.transition(client, 'max');
                } else if (client.adjustableValue.atMin()) {
                    this.transition(client, 'min');
                } else {
                    this.transition(client, 'stopped');
                }
            }
        },
        max: {
            _onEnter: function(client) {
                client.autoIncreaseBtn.innerHTML = client.getMaxString();
                client.autoIncreaseBtn.disabled = 'disabled';
                client.autoDecreaseBtn.innerHTML = client.getDecreaseString();
                client.autoDecreaseBtn.disabled = '';
            },
            _onExit: function(client) {
                client.autoIncreaseBtn.disabled = '';
                client.autoDecreaseBtn.disabled = '';
            },
            atMin: 'min',
            neitherMaxNorMin: 'stopped',
            clickDecreasing: 'decreasing'
        },
        min: {
            _onEnter: function(client) {
                client.autoIncreaseBtn.innerHTML = client.getIncreaseString();
                client.autoIncreaseBtn.disabled = '';
                client.autoDecreaseBtn.innerHTML = client.getMinString();
                client.autoDecreaseBtn.disabled = 'disabled';
            },
            _onExit: function(client) {
                client.autoIncreaseBtn.disabled = '';
                client.autoDecreaseBtn.disabled = '';
            },
            atMax: 'max',
            neitherMaxNorMin: 'stopped',
            clickIncreasing: 'increasing'
        },
        stopped: {
            _onEnter: function(client) {
                client.autoIncreaseBtn.innerHTML = client.getIncreaseString();
                client.autoDecreaseBtn.innerHTML = client.getDecreaseString();
            },
            atMax: 'max',
            atMin: 'min',
            clickIncreasing: 'increasing',
            clickDecreasing: 'decreasing'
        },
        increasing: {
            _onEnter: function(client) {
                client.autoIncreaseBtn.innerHTML = client.stopIncreaseString;
                client.autoDecreaseBtn.innerHTML = client.getDecreaseString();
                client.autoAdjustTimer = setInterval(client.increment.bind(client),
                                                     1000 * client.timeStep);
            },
            _onExit: function(client) {
                clearTimeout(client.autoAdjustTimer);
            },
            atMax: 'max',
            clickIncreasing: 'stopped',
            clickDecreasing: 'decreasing'
        },
        decreasing: {
            _onEnter: function(client) {
                client.autoIncreaseBtn.innerHTML = client.getIncreaseString();
                client.autoDecreaseBtn.innerHTML = client.stopDecreaseString;
                client.autoAdjustTimer = setInterval(client.decrement.bind(client),
                                                     1000 * client.timeStep);
            },
            _onExit: function(client) {
                clearTimeout(client.autoAdjustTimer);
            },
            atMin: 'min',
            clickIncreasing: 'increasing',
            clickDecreasing: 'stopped'
        }
    },
    updateValue: function(client) {
        if (client.adjustableValue.atMax()) this.handle(client, 'atMax');
        else if (client.adjustableValue.atMin()) this.handle(client, 'atMin');
        else this.handle(client, 'neitherMaxNorMin');
    },
    clickIncreasing: function(client) {
        this.handle(client, 'clickIncreasing');
    },
    clickDecreasing: function(client) {
        this.handle(client, 'clickDecreasing');
    }
});


function AutoAdjuster(options) {
    this.adjustableValue = options.adjustableValue;
    this.autoIncreaseBtn = document.getElementById(options.autoIncreaseBtn);
    this.autoDecreaseBtn = document.getElementById(options.autoDecreaseBtn);
    this.incrementStep = options.incrementStep;
    this.timeStep = options.timeStep;
    this.stopIncreaseString = 'Stop Auto-Increasing';
    this.stopDecreaseString = 'Stop Auto-Decreasing';
    this.autoAdjustTimer = null;

    this.adjustableValue.afterUpdate = AutoAdjusterBehavior.updateValue.bind(AutoAdjusterBehavior, this);
    this.autoIncreaseBtn.onclick = AutoAdjusterBehavior.clickIncreasing.bind(AutoAdjusterBehavior, this);
    this.autoDecreaseBtn.onclick = AutoAdjusterBehavior.clickDecreasing.bind(AutoAdjusterBehavior, this);
}
AutoAdjuster.prototype.getTimeStepString = function() {
    if (this.timeStep == 1) return 'sec';
    else return this.timeStep + ' sec';
}
AutoAdjuster.prototype.getRateString = function() {
    return this.incrementStep + this.adjustableValue.units + '/' + this.getTimeStepString();
}
AutoAdjuster.prototype.getIncreaseString = function() {
    return 'Increase by ' + this.getRateString();
}
AutoAdjuster.prototype.getDecreaseString = function() {
    return 'Decrease by ' + this.getRateString();
}
AutoAdjuster.prototype.getMaxString = function() {
    return 'Can\'t Increase Beyond ' + this.adjustableValue.max + this.adjustableValue.units;
}
AutoAdjuster.prototype.getMinString = function() {
    return 'Can\'t Decrease Beyond ' + this.adjustableValue.min + this.adjustableValue.units;
}
AutoAdjuster.prototype.increment = function() {
    this.adjustableValue.update(this.adjustableValue.getValue() + this.incrementStep, true);
}
AutoAdjuster.prototype.decrement = function() {
    this.adjustableValue.update(this.adjustableValue.getValue() - this.incrementStep, true);
}

var SimulationBehavior = new machina.BehavioralFsm({
    namespace: 'Simulation',
    initialState: 'ready',
    states: {
        ready: {
            _onEnter: function(client) {
                client.startResetBtn.innerHTML = 'Start';
                client.startResetBtn.disabled = '';
                client.pauseResumeBtn.disabled = 'disabled';
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
            disconnect: 'waitingForResponse'
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
            disconnect: 'waitingForResponse'
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
            disconnect: 'waitingForResponse'
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
    disconnect: function(client) {
        this.handle(client, 'disconnect');
    }
});
function Simulation(options) {
    this.socket = options.socket;
    this.startResetBtn = document.getElementById(options.startResetBtn);
    this.pauseResumeBtn = document.getElementById(options.pauseResumeBtn);
    this.downloadBtn = document.getElementById(options.downloadBtn);

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
    this.socket.on('simulation-state-info', function(data) {
        console.log('Sockets: Simulation state is: ' + data);
        if (data === 'ready') {
            SimulationBehavior.reset(simulation);
        } else if (data === 'running') {
            SimulationBehavior.start(simulation);
        } else if (data === 'stopped') {
            SimulationBehavior.pause(simulation);
        }
    })
    this.startResetBtn.onclick = SimulationBehavior.clickStartReset.bind(SimulationBehavior, this);
    this.pauseResumeBtn.onclick = SimulationBehavior.clickPauseResume.bind(SimulationBehavior, this);
}
