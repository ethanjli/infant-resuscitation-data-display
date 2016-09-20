var SensorConnectionBehavior = new machina.BehavioralFsm({
    namespace: 'SensorConnection',
    initialState: 'disconnected',
    states: {
        disconnected: {
            _onEnter: function(client) {
                client.delayedSensorConnectionBtn.innerHTML = 'Attach Sensors';
            },
            connect: 'connected',
            clickDelayedConnect: 'waitingToConnect',
            disconnectSocket: 'waitingForResponse'
        },
        waitingToConnect: {
            _onEnter: function(client) {
                client.timeUntilDelayedConnection = client.delay;
                client.delayedConnectionTimer = setInterval(client.countDownDelayedConnection.bind(client), 1000);
                client.socket.emit('event', {'name': 'delayed-sensor-connection-timer-started'});
            },
            _onExit: function(client) {
                if (client.delayedConnectionTimer) clearInterval(client.delayedConnectionTimer);
            },
            connect: 'connected',
            disconnect: 'disconnected',
            clickDelayedConnect: 'disconnected',
            delayedConnectionTimeout: function(client) {
                this.transition(client, 'waitingForResponse');
                client.socket.emit('event', {'name': 'delayed-sensor-connection-timer-completed'});
                client.socket.emit('sensor-connection', true);
            },
            disconnectSocket: 'waitingForResponse'
        },
        connected: {
            _onEnter: function(client) {
                client.delayedSensorConnectionBtn.innerHTML = 'Detach Sensors';
            },
            disconnect: 'disconnected',
            clickDelayedConnect: function(client) {
                this.transition(client, 'waitingForResponse');
                client.socket.emit('sensor-connection', false);
            },
            disconnectSocket: 'waitingForResponse'

        },
        waitingForResponse: {
            _onEnter: function(client) {
                client.delayedSensorConnectionBtn.disabled = 'disabled';
            },
            _onExit: function(client) {
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
    this.delayedSensorConnectionBtn.onclick = SensorConnectionBehavior.clickDelayedConnect.bind(SensorConnectionBehavior, this);
}
SensorConnection.prototype.countDownDelayedConnection = function() {
    if (this.timeUntilDelayedConnection > 0) {
        this.delayedSensorConnectionBtn.innerHTML = 'Cancel Sensor Connection (' + this.timeUntilDelayedConnection + ' sec left)';
        this.timeUntilDelayedConnection--;
        return;
    }
    SensorConnectionBehavior.delayedConnectionTimeout(this);
    this.delayedSensorConnectionBtn.innerHTML = 'Connecting now...';
}

var InterventionResponseBehavior = new machina.BehavioralFsm({
    namespace: 'InterventionResponse',
    initialState: 'delivered',
    states: {
        delivered: { // as in, infant was delivered
            _onEnter: function(client) {
                client.interventionBtn.innerHTML = client.startInterventionText;
                client.immediateInterventionBtn.innerHTML = client.startInterventionImmediatelyText;
                if (client.interruptResumeInterventionBtn) {
                    client.interruptResumeInterventionBtn.innerHTML = client.interruptInterventionText;
                    client.interruptResumeInterventionBtn.disabled = 'disabled';
                }
                client.responding = false;
                client.interrupted = false;
                client.onDelivered();
            },
            clickIntervention: 'interventionStarted',
            clickImmediateIntervention: 'responding',
            reset: function(client) {
                client.responding = false;
                client.interrupted = false;
                client.onDelivered();
            }
        },
        interventionStarted: {
            _onEnter: function(client) {
                client.timeUntilResponse = client.delay;
                client.interventionResponseTimer = setInterval(client.countDownInterventionResponse.bind(client), 1000);
                client.socket.emit('event', {'name': 'intervention-started', 'interventionName': client.name});
            },
            _onExit: function(client) {
                if (client.interventionResponseTimer) clearInterval(client.interventionResponseTimer);
            },
            clickIntervention: 'delivered',
            clickImmediateIntervention: 'responding',
            interventionResponseTimeout: 'responding',
            reset: 'delivered'
        },
        responding: {
            _onEnter: function(client) {
                client.interventionBtn.innerHTML = client.respondingText;
                client.interventionBtn.disabled = 'disabled';
                client.immediateInterventionBtn.innerHTML = client.stopRespondingText;
                if (client.interruptResumeInterventionBtn) {
                    client.interruptResumeInterventionBtn.innerHTML = client.interruptInterventionText;
                    client.interruptResumeInterventionBtn.disabled = '';
                }
                if (client.responding === false) { // this occurs if we transition from delivered or interventionStarted but not interrupted
                    client.socket.emit('event', {'name': 'intervention-response-started', 'interventionName': client.name});
                    client.onResponding();
                }
                client.responding = true;
            },
            _onExit: function(client) {
                client.interventionBtn.disabled = '';
                if (client.interruptResumeInterventionBtn) {
                    client.interruptResumeInterventionBtn.disabled = 'disabled';
                }
            },
            clickImmediateIntervention: function(client) {
                client.socket.emit('event', {'name': 'intervention-response-stopped', 'interventionName': client.name});
                client.onStopped();
                this.transition(client, 'delivered');
            },
            clickInterruptResumeIntervention: 'interrupted',
            reset: 'delivered'
        },
        interrupted: {
            _onEnter: function(client) {
                client.interventionBtn.disabled = 'disabled';
                if (client.interruptResumeInterventionBtn) {
                    client.interruptResumeInterventionBtn.innerHTML = client.resumeInterventionText;
                    client.interruptResumeInterventionBtn.disabled = '';
                }
                client.interrupted = true;
                client.socket.emit('event', {'name': 'intervention-response-interrupted', 'interventionName': client.name});
                client.onInterrupted();
            },
            _onExit: function(client) {
                if (client.interruptResumeInterventionBtn) {
                    client.interruptResumeInterventionBtn.disabled = 'disabled';
                }
                client.interrupted = false;
            },
            clickImmediateIntervention: function(client) {
                client.socket.emit('event', {'name': 'intervention-response-stopped', 'interventionName': client.name});
                client.onStopped();
                this.transition(client, 'delivered');
            },
            clickInterruptResumeIntervention: function(client) {
                client.socket.emit('event', {'name': 'intervention-response-resumed', 'interventionName': client.name});
                this.transition(client, 'responding');
                client.onResume();
            },
            reset: 'delivered'
        }
    },
    reset: function(client) {
        this.handle(client, 'reset');
    },
    clickIntervention: function(client) {
        this.handle(client, 'clickIntervention');
    },
    clickImmediateIntervention: function(client) {
        this.handle(client, 'clickImmediateIntervention');
    },
    clickInterruptResumeIntervention: function(client) {
        this.handle(client, 'clickInterruptResumeIntervention');
    },
    interventionResponseTimeout: function(client) {
        this.handle(client, 'interventionResponseTimeout');
    }
});
function InterventionResponse(options) {
    this.name = options.name;
    this.interventionBtn = document.getElementById(options.interventionBtn);
    this.immediateInterventionBtn = document.getElementById(options.immediateInterventionBtn);
    if (options.interruptResumeInterventionBtn) {
        this.interruptResumeInterventionBtn = document.getElementById(options.interruptResumeInterventionBtn);
    }
    this.delay = options.delay;
    this.startInterventionText = options.startInterventionText;
    this.startInterventionImmediatelyText = options.startInterventionImmediatelyText;
    this.cancelInterventionText = options.cancelInterventionText;
    this.respondingText = options.respondingText;
    this.stopRespondingText = options.stopRespondingText;
    this.interruptInterventionText = options.interruptInterventionText;
    this.resumeInterventionText = options.resumeInterventionText;
    this.interventionResponseTimer = null;
    this.timeUntilResponse = 0;
    this.socket = options.socket;
    this.responding = false;
    this.interrupted = false;
    this.listen();
    this.monitor();
}
InterventionResponse.prototype.listen = function() {
    this.socket.on('reset', InterventionResponseBehavior.reset.bind(InterventionResponseBehavior, this));
    this.socket.on('connect', InterventionResponseBehavior.reset.bind(InterventionResponseBehavior, this));
    this.socket.on('simulation-state-info', (function(data) {
        if (data === 'ready') InterventionResponseBehavior.reset(this);
    }).bind(this));
    this.socket.on('tick', (function() {
        if (this.responding) {
            if (this.interrupted) this.updateInterruptedResponse();
            else this.updateResponse();
        }
    }).bind(this));
    this.socket.on('fiO2', (function() {
        if (this.responding) {
            if (this.interrupted) this.updateInterruptedResponse();
            else this.updateResponse();
        }
    }).bind(this));
}
InterventionResponse.prototype.monitor = function() {
    this.interventionBtn.onclick = InterventionResponseBehavior.clickIntervention.bind(InterventionResponseBehavior, this);
    this.immediateInterventionBtn.onclick = InterventionResponseBehavior.clickImmediateIntervention.bind(InterventionResponseBehavior, this);
    if (this.interruptResumeInterventionBtn) {
        this.interruptResumeInterventionBtn.onclick = InterventionResponseBehavior.clickInterruptResumeIntervention.bind(InterventionResponseBehavior, this);
    }
}
InterventionResponse.prototype.countDownInterventionResponse = function() {
    if (this.timeUntilResponse > 0) {
        this.interventionBtn.innerHTML = this.cancelInterventionText + ' (' + this.timeUntilResponse + ' sec left)';
        this.timeUntilResponse--;
        return;
    }
    InterventionResponseBehavior.interventionResponseTimeout(this);
}
InterventionResponse.prototype.onDelivered = function() {}
InterventionResponse.prototype.onResponding = function() {}
InterventionResponse.prototype.onInterrupted = function() {}
InterventionResponse.prototype.onResume = function() {}
InterventionResponse.prototype.updateResponse = function() {}
InterventionResponse.prototype.updateInterruptedResponse = function() {}
InterventionResponse.prototype.onStopped = function() {}
