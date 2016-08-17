function toDateString(totalSeconds) {
    var minutes = parseInt(totalSeconds / 60) % 60;
    var seconds = totalSeconds % 60;
    return (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
}

function ReadableValue(elemId, units, socket, messageName) {
    this.elem = document.getElementById(elemId);
    this.units = units;
    this.socket = socket;
    this.messageName = messageName;
}
ReadableValue.prototype.update = function(newValue) {
    if (this.units === 'time') {
        newValue = toDateString(newValue);
    }
    this.elem.innerHTML = newValue;
}
ReadableValue.prototype.listen = function() {
    this.socket.on(this.messageName, this.update.bind(this))
}

