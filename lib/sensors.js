module.exports = function() {
  var i = 0;
  var signalTimes = [];
  var spO2Signal = [];
  var fiO2Signal = [];

  var startTime = 20;
  var timeIncrement = 1;
  var time = startTime;
  var spO2 = 0;
  var spO2Noise = 0.03;
  var fiO2 = 0;

  function uniformRandom(min, max) {
    return min + Math.random() * (max - min);
  }
  function limitRange(x, min, max) {
    return Math.max(Math.min(x, max), min);
  }

  return {
    sampleNext: function() {
      time = startTime + i * timeIncrement;
      signalTimes.push(time);
      spO2Signal.push(limitRange(spO2 + uniformRandom(-spO2Noise, spO2Noise), 0, 1));
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
      time = startTime;
      spO2 = NaN;
      spO2Noise = 0.03;
      fiO2 = NaN;
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
    setSpO2: function(newSpO2) {
      spO2 = newSpO2;
    },
    setSpO2Noise: function(newSpO2Noise) {
      spO2Noise = newSpO2Noise;
    },
    setFiO2: function(newFiO2) {
      fiO2 = newFiO2;
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
