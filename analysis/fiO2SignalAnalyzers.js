var everpolate = require('everpolate');
var utils = require('./signalAnalyzerUtils');

module.exports = {
  generateInTargetRange: function(controlPanelType) {
    return {
      name: 'inFiO2TargetRange',
      description: 'Whether the FiO2 is within the optimal range for the NRP target',
      sourceSignalName: 'fiO2',
      mapper: function(time, value) {
        return utils.inRange(value, kFiO2Range[controlPanelType]);
      }
    };
  },
  generateOutsideTargetRange: function(controlPanelType) {
    return {
      name: 'outsideFiO2TargetRange',
      description: 'Whether the FiO2 is outside the optimal range for the NRP target',
      sourceSignalName: 'fiO2',
      mapper: function(time, value) {
        return utils.outsideRange(value, kFiO2Range[controlPanelType]);
      }
    };
  },
  generateAboveTargetRange: function(controlPanelType) {
    return {
      name: 'aboveFiO2TargetRange',
      description: 'Whether the FiO2 is above the optimal range for the NRP target',
      sourceSignalName: 'fiO2',
      mapper: function(time, value) {
        return utils.aboveRange(value, kFiO2Range[controlPanelType]);
      }
    };
  },
  generateBelowTargetRange: function(controlPanelType) {
    return {
      name: 'belowFiO2TargetRange',
      description: 'Whether the FiO2 is below the optimal range for the NRP target',
      sourceSignalName: 'fiO2',
      mapper: function(time, value) {
        return utils.belowRange(value, kFiO2Range[controlPanelType]);
      }
    };
  },
  generateSignedDistanceFromTargetRange: function(controlPanelType) {
    return {
      name: 'signedDistanceFromFiO2TargetRange',
      description: 'Signed percentage points between the FiO2 and the nearest bound of the optimal range for the NRP target, if FiO2 is outside that range',
      sourceSignalName: 'fiO2',
      mapper: function(time, value) {
        return utils.signedDistanceFromRange(value, kFiO2Range[controlPanelType]);
      }
    };
  },
  generateUnsignedDistanceFromTargetRange: function(controlPanelType) {
    return {
      name: 'unsignedDistanceFromFiO2TargetRange',
      description: 'Absolute value (unsigned) of percentage points between the FiO2 and the nearest bound of the optimal range for the NRP target, if FiO2 is outside that range',
      sourceSignalName: 'fiO2',
      mapper: function(time, value) {
        return utils.unsignedDistanceFromRange(value, kFiO2Range[controlPanelType]);
      }
    };
  },
  generateSignedDirectionFromTargetRange: function(controlPanelType) {
    return {
      name: 'signedDirectionFromFiO2TargetRange',
      description: 'Sign of difference between the FiO2 and the nearest bound of the optimal range for the NRP target, if FiO2 is outside that range',
      sourceSignalName: 'fiO2',
      mapper: function(time, value) {
        return utils.signedDirectionFromRange(value, kFiO2Range[controlPanelType]);
      }
    };
  },
  idealScenarioRange: {
    name: 'fiO2Region',
    description: 'FiO2 region. -2: 21%, -1: 22-25%, 0: 26-34%, 1: 35-100%',
    sourceSignalName: 'fiO2',
    mapper: function(time, value) {
      if (value < 0.215) return -2;
      if (value < 0.255) return -1;
      if (value < 0.345) return 0;
      if (value >= 0.345) return 1;
      return null;
    }
  },
  extremeScenarioRange: {
    name: 'fiO2Region',
    description: 'FiO2 region. -4: 21%, -3: 22-34%, -2: 35-59%, -1: 60-89%, 0: 90-100%',
    sourceSignalName: 'fiO2',
    mapper: function(time, value) {
      if (value < 0.215) return -4;
      if (value < 0.345) return -3;
      if (value < 0.595) return -2;
      if (value < 0.895) return -1;
      if (value >= 0.895) return 0;
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

var kFiO2Range = {
  'ideal-scenario-control-panel': {
    lower: 0.25,
    upper: 0.34
  },
  'extreme-scenario-control-panel': {
    lower: 0.9,
    upper: 1.0
  }
};

