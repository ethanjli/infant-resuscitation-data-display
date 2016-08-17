function AdjustableValue(inputElemId, units, socket, messageName) {
    this.inputElem = document.getElementById(inputElemId);
    this.units = units;
    this.min = parseInt(this.inputElem.min);
    this.max = parseInt(this.inputElem.max);
    this.socket = socket;
    this.messageName = messageName;
}
AdjustableValue.prototype.update = function(newValue, emit) {
    if (this.min !== undefined) newValue = Math.max(this.min, newValue);
    if (this.max !== undefined) newValue = Math.min(this.max, newValue);
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
        var value = this.inputElem.value;
        if (this.units === '%') value /= 100;
        this.afterUpdate();
        this.socket.emit(this.messageName, value);
    }).bind(this);
}
AdjustableValue.prototype.getValue = function() {
    return parseInt(this.inputElem.value);
}

function AutoAdjuster(adjustableValue, autoIncrementBtnId, autoDecrementBtnId, increment, timeStep) {
    this.adjustableValue = adjustableValue;
    this.adjustableValue.afterUpdate = this.afterUpdate.bind(this);
    this.autoIncrementBtn = document.getElementById(autoIncrementBtnId);
    this.autoDecrementBtn = document.getElementById(autoDecrementBtnId);
    this.increment = increment;
    this.timeStep = timeStep;
    var timeStepString;
    if (timeStep === 1) timeStepString = 'sec';
    else timeStepString = timeStep + ' sec';
    this.timeStepString = timeStepString;
    var units = adjustableValue.units;
    this.increaseString = 'Increase by ' + increment + units + '/' + timeStepString;
    this.decreaseString = 'Decrease by ' + increment + units + '/' + timeStepString;
    this.noIncreaseString = 'Can\'t Increase Beyond ' + adjustableValue.max + units;
    this.noDecreaseString = 'Can\'t Decrease Beyond ' + adjustableValue.min + units;
    this.stopIncreaseString = 'Stop Auto-Increasing';
    this.stopDecreaseString = 'Stop Auto-Decreasing';
    this.autoIncrementBtn.innerHTML = this.increaseString;
    this.autoDecrementBtn.innerHTML = this.decreaseString;
}
AutoAdjuster.prototype.afterUpdate = function() {
    var autoIncrementBtn = this.autoIncrementBtn;
    var autoDecrementBtn = this.autoDecrementBtn;
    var value = this.adjustableValue.getValue();
    var max = this.adjustableValue.max;
    var min = this.adjustableValue.min;
    var units = this.adjustableValue.units;
    if (value >= max) {
        autoIncrementBtn.innerHTML = this.noIncreaseString;
        autoIncrementBtn.disabled = 'disabled';
        autoDecrementBtn.innerHTML = this.decreaseString;
        autoDecrementBtn.disabled = '';
        clearInterval(this.autoAdjustTimer);
    } else if (value <= min) {
        autoDecrementBtn.innerHTML = this.noDecreaseString;
        autoDecrementBtn.disabled = 'disabled';
        autoIncrementBtn.innerHTML = this.increaseString;
        autoIncrementBtn.disabled = '';
        clearInterval(this.autoAdjustTimer);
    } else {
        if (autoIncrementBtn.innerHTML === this.noIncreaseString) {
            autoIncrementBtn.innerHTML = this.increaseString;
            autoIncrementBtn.disabled = '';
        }
        if (autoDecrementBtn.innerHTML === this.noDecreaseString) {
            autoIncrementBtn.innerHTML = this.decreaseString;
            autoDecrementBtn.disabled = '';
        }
    }
}
AutoAdjuster.prototype.monitor = function() {
    var value = this.adjustableValue;
    var autoIncrementBtn = this.autoIncrementBtn;
    var autoDecrementBtn = this.autoDecrementBtn;
    autoIncrementBtn.onclick = (function() {
        clearInterval(this.autoAdjustTimer);
        if (autoIncrementBtn.innerHTML === this.increaseString) {
            autoIncrementBtn.innerHTML = this.stopIncreaseString;
            autoDecrementBtn.innerHTML = this.decreaseString;
            autoDecrementBtn.disabled = '';
            this.autoAdjustTimer = setInterval((function() {
                console.log('Incrementing');
                value.update(value.getValue() + this.increment, true);
            }).bind(this), 1000 * this.timeStep);
        } else if (autoIncrementBtn.innerHTML === this.stopIncreaseString) {
            autoIncrementBtn.innerHTML = this.increaseString;
        }
    }).bind(this);
    autoDecrementBtn.onclick = (function() {
        clearInterval(this.autoAdjustTimer);
        if (autoDecrementBtn.innerHTML === this.decreaseString) {
            autoDecrementBtn.innerHTML = this.stopDecreaseString;
            autoIncrementBtn.innerHTML = this.increaseString;
            autoIncrementBtn.disabled = '';
            this.autoAdjustTimer = setInterval((function() {
                value.update(value.getValue() - this.increment, true);
            }).bind(this), 1000 * this.timeStep);
        } else if (autoDecrementBtn.innerHTML === this.stopDecreaseString) {
            autoDecrementBtn.innerHTML = this.decreaseString;
        }
    }).bind(this);
}
