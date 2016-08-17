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
    this.scanSpeed = 0.75;

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

var ecgData = [
    0.004206787109375, 0.0052380371093750005, 0.006586181640625, 0.008400146484375001,
    0.010904296875, 0.0144892578125, 0.0196798095703125, 0.049684204101562504,
    0.0886883544921875, 0.11185363769531251, 0.134164306640625, 0.137352294921875,
    0.1160369873046875, 0.08516308593750001, 0.0539765625, 0.014997436523437501,
    -0.015882568359375, -0.0387554931640625, -0.06125732421875, -0.0745780029296875,
    -0.07479357910156251, -0.0725338134765625, -0.0418538818359375,
    0.08582861328125001, 0.397717529296875, 0.8136408691406251, 1.2295617980957032,
    0.9944150390625001, 0.2824605712890625, -0.38949267578125, -0.597251220703125,
    -0.425675537109375, -0.1537947998046875, -0.0500914306640625, -0.0111041259765625,
    0.0027451171875, 0.0071739501953125, 0.008443359375, 0.0094327392578125,
    0.012530517578125, 0.0176046142578125, 0.0300162353515625, 0.056962646484375004,
    0.0898175048828125, 0.10311853027343751, 0.1312630615234375, 0.1529300537109375,
    0.167607177734375, 0.1899068603515625, 0.2124422607421875, 0.235044677734375,
    0.2575535888671875, 0.2724073486328125, 0.286978271484375, 0.3007579345703125,
    0.3067425537109375, 0.3106370849609375, 0.303756103515625, 0.2897236328125,
    0.25916931152343753, 0.2200599365234375, 0.1728209228515625, 0.133416259765625,
    0.086224853515625, 0.05493408203125, 0.02409423828125, 0.00922607421875,
    -0.0043409423828125, -0.0097349853515625, -0.013127685546875, -0.01423095703125,
    -0.013834716796875, -0.012556030273437501, -0.010675048828125, -0.00835888671875,
];

var ppgData = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0.001037353515625, 0.00172119140625, 0.0027232666015625, 0.0033880615234375,
    0.004206787109375, 0.0052380371093750005, 0.006586181640625, 0.008400146484375001,
    0.010904296875, 0.0144892578125, 0.015882568359375, 0.0387554931640625,
    0.06125732421875, 0.0745780029296875, 0.08582861328125001, 0.12, 0.18, 0.24,
    0.397717529296875, 0.8136408691406251, 1.1295617980957032, 1.2, 1.24, 1.2, 1.13,
    0.9944150390625001, 0.9, 0.8, 0.75, 0.735, 0.72, 0.71, 0.7, 0.67, 0.63, 0.59,
    0.45, 0.35, 0.3, 0.225, 0.2, 0.175, 0.1537947998046875, 0.125, 0.1, 0.075,
    0.0625, 0.05, 0.03125, 0.025, 0.0125, 0.0111041259765625, 0.0025, 0,
];
console.log(ecgData.length, ppgData.length);