function clamp(value, min, max) {
    if (min !== undefined && min !== null && !isNaN(min)) value = Math.max(min, value);
    if (max !== undefined && max !== null && !isNaN(max)) value = Math.min(max, value);
    return value;
}
function toDateString(totalSeconds) {
    var minutes = parseInt(totalSeconds / 60) % 60;
    var seconds = totalSeconds % 60;
    return (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
}

var nrpTarget = {
    time: [60, 300, 600, 2400],
    upper: [0.65, 0.85, 0.95, 0.95],
    lower: [0.6, 0.8, 0.85, 0.85]
};
function getTargetRange(time) {
    var upper = NaN;
    var lower = NaN;
    if (time >= nrpTarget.time[0]) {
        upper = everpolate.linear(time, nrpTarget.time, nrpTarget.upper)[0];
        lower = everpolate.linear(time, nrpTarget.time, nrpTarget.lower)[0];
    }
    return {
        upper: upper,
        lower: lower,
        mid: 0.5 * (upper + lower)
    };
}

function ReadableValue(options) {
    this.elem = document.getElementById(options.elem);
    this.units = options.units;
    this.min = options.min;
    this.max = options.max;
    this.missingString = options.missingString;
    this.socket = options.socket;
    this.messageName = options.messageName;
    if (this.socket) this.listen();
}
ReadableValue.prototype.update = function(newValue) {
    if (newValue === undefined || newValue === null || isNaN(newValue)) {
        this.elem.innerHTML = this.missingString;
        return;
    }
    newValue = clamp(newValue, this.min, this.max);
    this.rawValue = newValue;
    if (this.units === 'time') {
        newValue = toDateString(newValue);
    } else if (this.units === 'bpm') {
        newValue = Math.round(newValue);
    } else if (this.units === '%') {
        newValue = Math.round(newValue * 100) + '%';
    }
    this.elem.innerHTML = newValue;
}
ReadableValue.prototype.listen = function() {
    if (this.messageName) this.socket.on(this.messageName, this.update.bind(this));
}

