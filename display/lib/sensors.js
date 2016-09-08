var _ = require('lodash');
var gaussian = require('gaussian');

function Series(options) {
  this.defaultValue = options.defaultValue;
  this.value = options.defaultValue;
  this.signal = [];
}
Series.prototype.reset = function() {
  this.signal = [];
  this.value = this.defaultValue;
}
Series.prototype.update = function(value) {
  if (value === undefined || value === null) value = NaN;
  this.signal.push(value);
  this.value = value;
}
Series.prototype.get = function(index) {
  return this.signal[index]
}
Series.prototype.getUntil = function(index) {
  return this.signal.slice(0, index + 1);
}

module.exports = function() {
  var sampleCounter = 0;
  var tickCounter = 0; // increments time by 1, but only transiently - not saved in signalTimes

  var series = {};
  series.time = new Series({defaultValue: 0});
  series.spO2Mean = new Series({defaultValue: 0});
  series.spO2Noise = new Series({defaultValue: 0.01});
  series.spO2 = new Series({defaultValue: 0});
  series.fiO2 = new Series({defaultValue: 0.21});
  series.hr = new Series({defaultValue: 0});
  series.sensorConnection = new Series({defaultValue: false});
  series.spO2Sensor = new Series({defaultValue: 0});
  series.hrSensor = new Series({defaultValue: 0});

  var timeIncrement = 2;
  var spO2Noise = 0.01;
  var gaussianDist = gaussian(series.spO2Mean.value, series.spO2Noise.value * series.spO2Noise.value);

  function limitRange(x, min, max) {
    return Math.max(Math.min(x, max), min);
  }

  function resetSeries() {
    _.forOwn(series, function(currentSeries) {
      currentSeries.reset();
    });
  }
  function getSeriesAt(index) {
    return _.mapValues(series, function(currentSeries) {
      return currentSeries.get(index);
    });
  }
  function getSeriesUntil(index) {
    return _.mapValues(series, function(currentSeries) {
      return currentSeries.getUntil(index);
    });
  }

  return {
    tickNext: function() {
      series.time.value = Math.max(0, sampleCounter * timeIncrement + tickCounter - 1);
      tickCounter++;
      return series.time.value;
    },
    sampleNext: function() {
      series.time.update(sampleCounter * timeIncrement);
      series.spO2Mean.update(series.spO2Mean.value);
      series.spO2Noise.update(series.spO2Noise.value);
      series.spO2.update(limitRange(gaussianDist.ppf(Math.random()), 0, 1));
      series.fiO2.update(series.fiO2.value);
      series.hr.update(series.hr.value);
      if (series.sensorConnection.value) {
        series.spO2Sensor.update(series.spO2.value);
        series.hrSensor.update(series.hr.value);
      } else {
        series.spO2Sensor.update();
        series.hrSensor.update();
      }
      series.sensorConnection.update(series.sensorConnection.value);
      var data = getSeriesAt(sampleCounter);
      sampleCounter++;
      tickCounter = 0;
      return data;
    },
    reset: function() {
      sampleCounter = 0;
      tickCounter = 0;
      resetSeries();
    },
    sampleAllPrevious: function() {
      if (sampleCounter == 0) {
        return null;
      }
      return getSeriesUntil(sampleCounter);
    },
    setSpO2Mean: function(newSpO2Mean) {
      if (series.spO2Mean.value !== newSpO2Mean) {
        gaussianDist = gaussian(newSpO2Mean, series.spO2Noise.value * series.spO2Noise.value);
      }
      series.spO2Mean.value = newSpO2Mean;
    },
    setSpO2Noise: function(newSpO2Noise) {
      if (spO2Noise.value !== newSpO2Noise) {
        gaussianDist = gaussian(series.spO2Mean.value, newSpO2Noise * newSpO2Noise);
      }
      series.spO2Noise.value = newSpO2Noise;
    },
    setFiO2: function(newFiO2) {
      series.fiO2.value = newFiO2;
    },
    setHR: function(newHR) {
      series.hr.value = newHR;
    },
    setSensorConnection: function(whetherConnected) {
      series.sensorConnection.value = whetherConnected;
    },
    get: function(seriesName) {
      return series[seriesName].value;
    }
  }
}()
