var everpolate = require('everpolate');
var utils = require('./signalAnalyzerUtils');

module.exports = {
  inTargetRange: {
    name: 'inSpO2TargetRange',
    description: 'Whether the SpO2 is within the (interpolated) NRP target range',
    sourceSignalName: 'spO2Mean',
    mapper: function(time, value) {
      return utils.inRange(value, getTargetRange(time, true));
    }
  },
  inLooseTargetRange: {
    name: 'inSpO2LooseTargetRange',
    description: 'Whether the SpO2 is near the (interpolated) NRP target range, namely within +/- 5 percentage points.',
    sourceSignalName: 'spO2Mean',
    mapper: function(time, value) {
      return utils.inLooseRange(value, getTargetRange(time, true));
    }
  },
  outsideTargetRange: {
    name: 'outsideSpO2TargetRange',
    description: 'Whether the SpO2 is outside the (interpolated) NRP target range',
    sourceSignalName: 'spO2Mean',
    mapper: function(time, value) {
      return utils.outsideRange(value, getTargetRange(time, true));
    }
  },
  aboveTargetRange: {
    name: 'aboveSpO2TargetRange',
    description: 'Whether the SpO2 is above the (interpolated) NRP target range',
    sourceSignalName: 'spO2Mean',
    mapper: function(time, value) {
      return utils.aboveRange(value, getTargetRange(time, true));
    }
  },
  belowTargetRange: {
    name: 'belowSpO2TargetRange',
    description: 'Whether the SpO2 is below the (interpolated) NRP target range',
    sourceSignalName: 'spO2Mean',
    mapper: function(time, value) {
      return utils.belowRange(value, getTargetRange(time, true));
    }
  },
  signedDistanceFromTargetRange: {
    name: 'signedDistanceFromSpO2TargetRange',
    description: 'Signed percentage points between the SpO2 and the nearest bound of the (interpolated) NRP target range, if SpO2 is outside the range',
    sourceSignalName: 'spO2Mean',
    mapper: function(time, value) {
      return utils.signedDistanceFromRange(value, getTargetRange(time, true));
    }
  },
  unsignedDistanceFromTargetRange: {
    name: 'unsignedDistanceFromSpO2TargetRange',
    description: 'Absolute value (unsigned) of percentage points between the SpO2 and the nearest bound of the (interpolated) NRP target range, if SpO2 is outside the range',
    sourceSignalName: 'spO2Mean',
    mapper: function(time, value) {
      return utils.unsignedDistanceFromRange(value, getTargetRange(time, true));
    }
  },
  squaredDistanceFromTargetRange: {
    name: 'squaredDistanceFromSpO2TargetRange',
    description: 'Squared percentage points between the SpO2 and the nearest bound of the (interpolated) NRP target range, if SpO2 is outside the range',
    sourceSignalName: 'spO2Mean',
    mapper: function(time, value) {
      return utils.squaredDistanceFromRange(value, getTargetRange(time, true));
    }
  },
  signedDirectionFromTargetRange: {
    name: 'signedDirectionFromSpO2TargetRange',
    description: 'Sign of difference between the SpO2 and the nearest bound of the (interpolated) NRP target range, if SpO2 is outside the range',
    sourceSignalName: 'spO2Mean',
    mapper: function(time, value) {
      return utils.signedDirectionFromRange(value, getTargetRange(time, true));
    }
  },
  idealScenarioRange: {
    name: 'spO2Region',
    description: 'SpO2 region. -2: [0%, 52.5%), -1: [52.5%, mean(52.5%, NRP goal)), 0: [mean(52.5%, NRP goal), mean(NRP goal, NRP upper + 5%)), 1: [mean(NRP goal, NRP upper + 5%), 100%]',
    sourceSignalName: 'spO2Mean',
    mapper: function(time, value) {
      var targetRange = getTargetRange(time, false);
      if (value < 0.525) return -2;
      if (value < 0.5 * (0.525 + targetRange.mid)) return -1;
      if (value < 0.5 * (targetRange.mid + targetRange.upper + 0.05)) return 0;
      if (value >= 0.5 * (targetRange.mid + targetRange.upper + 0.05)) return 1;
      return null;
    }
  },
  extremeScenarioRange: {
    name: 'spO2Region',
    description: 'SpO2 region. -4: [0%, 35%), -3: [35%, mean(40%, NRP lower - 10%)), -2: [mean(40%, NRP lower - 10%), mean(NRP lower - 10%, NRP lower - 5%)), -1: [mean(NRP lower - 10%, NRP lower - 5%), mean(NRP lower - 5%, NRP goal)), 0: [mean(NRP lower - 5%, NRP goal), 100%]',
    sourceSignalName: 'spO2Mean',
    mapper: function(time, value) {
      var targetRange = getTargetRange(time, false);
      if (value < 0.35) return -4;
      if (value < 0.5 * (0.4 + targetRange.lower - 0.1)) return -3;
      if (value < 0.5 * (targetRange.lower - 0.1 + targetRange.lower - 0.05)) return -2;
      if (value < 0.5 * (targetRange.lower - 0.05 + targetRange.mid)) return -1;
      if (value >= 0.5 * (targetRange.lower - 0.05 + targetRange.mid)) return 0;
      return value;
    }
  }
}
module.exports.generateRegion = function(controlPanelType) {
  if (controlPanelType === 'ideal-scenario-control-panel') {
    return module.exports.idealScenarioRange;
  } else if (controlPanelType === 'extreme-scenario-control-panel') {
    return module.exports.extremeScenarioRange;
  } else {
    throw {
      name: 'Unknown control panel type',
      data: controlPanelType
    };
  }
}

var kNRPTarget = {
    time: [60, 300, 600, 2400],
    upper: [0.65, 0.85, 0.95, 0.95],
    lower: [0.6, 0.8, 0.85, 0.85]
};

function getTargetRange(time, strictTime) {
    var upper = NaN;
    var lower = NaN;
    if (!strictTime || time >= kNRPTarget.time[0]) {
        upper = everpolate.linear(time, kNRPTarget.time, kNRPTarget.upper)[0];
        lower = everpolate.linear(time, kNRPTarget.time, kNRPTarget.lower)[0];
    }
    return {
        upper: upper,
        lower: lower,
        mid: 0.5 * (upper + lower)
    };
}

