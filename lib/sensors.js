var gaussian = require('gaussian');

module.exports = function() {
  var i = 0;
  var signalTimes = [];
  var spO2Signal = [];
  var fiO2Signal = [];

  var timeIncrement = 1;
  var time = 0;
  var sensorsConnected = false;
  var spO2 = 0;
  var spO2Noise = 0.02;
  var gaussianDist;
  var fiO2 = 0;

  function limitRange(x, min, max) {
    return Math.max(Math.min(x, max), min);
  }

  return {
    sampleNext: function() {
      time = i * timeIncrement;
      signalTimes.push(time);
      if (sensorsConnected) {
        spO2Signal.push(limitRange(gaussianDist.ppf(Math.random()), 0, 1));
      } else {
        spO2Signal.push(NaN);
      }
      fiO2Signal.push(fiO2);
      var data = {
        time: signalTimes[i],
        spO2: spO2Signal[i],
        fiO2: fiO2Signal[i]
      };
      i = i + 1;
      return data;
    },
    reset: function() {
      i = 0;
      time = 0;
      sensorsConnected = false;
      spO2 = 0;
      spO2Noise = 0.02;
      fiO2 = 0;
      signalTimes = [];
      spO2Signal = [];
      fiO2Signal = [];
    },
    sampleAllPrevious: function() {
      if (i == 0) {
        return null;
      }
      return {
        time: signalTimes.slice(0, i + 1),
        spO2: spO2Signal.slice(0, i + 1),
        fiO2: fiO2Signal.slice(0, i + 1),
      };
    },
    setSensorConnection: function(whetherConnected) {
      sensorsConnected = whetherConnected;
    },
    setSpO2: function(newSpO2) {
      if (spO2 !== newSpO2) {
        spO2 = newSpO2;
        gaussianDist = gaussian(spO2, spO2Noise * spO2Noise);
      }
    },
    setSpO2Noise: function(newSpO2Noise) {
      if (spO2Noise !== newSpO2Noise) {
        spO2Noise = newSpO2Noise;
        gaussianDist = gaussian(spO2, spO2Noise * spO2Noise);
      }
    },
    setFiO2: function(newFiO2) {
      fiO2 = newFiO2;
    },
    getSensorConnection: function() {
      return sensorsConnected;
    },
    getSpO2: function() {
      return spO2;
    },
    getSpO2Noise: function() {
      return spO2Noise;
    },
    getFiO2: function() {
      return fiO2;
    }
  }
}()
