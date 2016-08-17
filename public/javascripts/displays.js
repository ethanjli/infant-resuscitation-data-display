function fromDateString(dateString) {
    var a = dateString.split(':');
    return a[0] * 60 + a[1] * 1;
}

function WaveformDisplay(canvasElemId, color, thickness, amplitudeGain, constantGain, data) {
    this.canvas = document.getElementById(canvasElemId);
    this.ctx = this.canvas.getContext('2d');
    this.fps = 60;
    this.scanBarWidth = 10;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = thickness;
    this.scanSpeed = 1;

    this.amplitudeGain = amplitudeGain;
    this.constantGain = constantGain;
    this.data = data;

    this.n = 0;
    this.x = 0;
    this.xOld = this.x;
    this.y = this.sample();
    this.yOld = this.y;
}
WaveformDisplay.prototype.sample = function() {
    return -1 * this.amplitudeGain * this.data[this.n] + this.constantGain;
}
WaveformDisplay.prototype.drawCurrentSegment = function() {
    var ctx = this.ctx;
    ctx.clearRect(this.x, 0, this.scanBarWidth, this.canvas.height);
    ctx.beginPath();
    ctx.moveTo(this.xOld, this.yOld);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
}
WaveformDisplay.prototype.draw = function() {
    setTimeout((function() {
        requestAnimationFrame(this.draw.bind(this));

        this.y = this.sample();
        this.n = (this.n + 1) % this.data.length;
        this.x += this.scanSpeed;

        this.drawCurrentSegment();

        this.xOld = this.x;
        this.yOld = this.y;
        if (this.xOld > this.canvas.width) this.x = this.xOld = -1 * this.scanSpeed;
    }).bind(this), 1000 / this.fps);
}
