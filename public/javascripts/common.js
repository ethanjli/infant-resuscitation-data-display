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

function ReadableValue(options) {
    this.elem = document.getElementById(options.elem);
    this.units = options.units;
    this.min = options.min;
    this.max = options.max;
    this.socket = options.socket;
    this.messageName = options.messageName;
    this.listen();
}
ReadableValue.prototype.update = function(newValue) {
    newValue = clamp(newValue, this.min, this.max);
    if (this.units === 'time') {
        newValue = toDateString(newValue);
    }
    this.elem.innerHTML = newValue;
}
ReadableValue.prototype.listen = function() {
    this.socket.on(this.messageName, this.update.bind(this))
}

