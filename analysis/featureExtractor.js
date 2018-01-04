var path = require('path');
var fs = require('fs');
var jsonfile = require('jsonfile');
var json2csv = require('json2csv');
var minimist = require('minimist');
var walker = require('walker');
var _ = require('lodash');

var eventAnalyzer = require('./eventAnalyzer');
var signalAnalyzer = require('./signalAnalyzer');

var kFeatureExtractors = [{
  name: 'id',
  description: 'Full unique tracing id (subject+scenario)',
  extractor: function(analysisResults) {
    return analysisResults.id;
  }
}, {
  name: 'subjectNumber',
  description: 'Subject id',
  extractor: function(analysisResults) {
    return analysisResults.subjectNumber;
  }
}, {
  name: 'scenarioNumber',
  description: 'Scenario number',
  extractor: function(analysisResults) {
    return analysisResults.scenarioNumber;
  }
}, {
  name: 'newAfterOld',
  description: 'Whether the new display came after the old display for the scenario type; 0 is before, 1 is after',
  extractor: function(analysisResults) {
    var displayPanel = analysisResults.clients.displayPanel;
    var scenarioNumber = analysisResults.scenarioNumber;
    if (displayPanel === 'minimal-display-panel') {
      if (scenarioNumber <= 2) return 1;
      else return 0;
    }
    else if (displayPanel === 'display-panel') {
      if (scenarioNumber >= 3) return 1;
      else return 0;
    }
    else {
      return NaN;
    }
  }
}, {
  name: 'scenarioType',
  description: 'Scenario type; 0 is ideal, 1 is extreme',
  extractor: function(analysisResults) {
    var controlPanel = analysisResults.clients.controlPanel;
    if (controlPanel === 'ideal-scenario-control-panel') return 0;
    else if (controlPanel === 'extreme-scenario-control-panel') return 1;
    else return NaN;
  }
}, {
  name: 'displayType',
  description: 'Display type; 0 is minimal, 1 is full',
  extractor: function(analysisResults) {
    var displayPanel = analysisResults.clients.displayPanel;
    if (displayPanel === 'minimal-display-panel') return 0;
    else if (displayPanel === 'display-panel') return 1;
    else return NaN;
  }
}, {
  name: 'sensorPlacementTime',
  description: 'Time when the pulse ox was placed on the infant',
  extractor: function(analysisResults) {
    var optionalObj = analysisResults.timeMeasurements.sensorPlaced;
    if (optionalObj === undefined) return NaN;
    return optionalObj.time;
  }
}, {
  name: 'ppvStartTime',
  description: 'Time when PPV was started',
  extractor: function(analysisResults) {
    var optionalObj = analysisResults.timeMeasurements.ppvStarted;
    if (optionalObj === undefined) return NaN;
    return optionalObj.time;
  }
}, {
  name: 'ccStartTime',
  description: 'Time when CC was started',
  extractor: function(analysisResults) {
    var optionalObj = analysisResults.timeMeasurements.ccStarted;
    if (optionalObj === undefined) return NaN;
    return optionalObj.time;
  }
}, {
  name: 'inSpO2TargetRangeDuration',
  description: 'Total duration in which SpO2 was inside the target range',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalSegmentations.inSpO2TargetRange.summary.totalDurationsByValue['true'];
    if (optional === undefined) return 0;
    return optional;
  }
}, {
  name: 'inSpO2LooseTargetRangeDuration',
  description: 'Total duration in which SpO2 was near the target range, specifically within +/- 5 percentage points of the target range.',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalSegmentations.inSpO2LooseTargetRange.summary.totalDurationsByValue['true'];
    if (optional === undefined) return 0;
    return optional;
  }
}, {
  name: 'inSpO2TargetRangeStartTime',
  description: 'Time when SpO2 first became inside the target range',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalSegmentations.inSpO2TargetRange.summary.initialSegmentsByValue['true'];
    if (optional === undefined) return NaN;
    return optional.start;
  }
}, {
  name: 'aboveSpO2TargetRangeDuration',
  description: 'Total duration in which SpO2 was above the target range',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalSegmentations.aboveSpO2TargetRange.summary.totalDurationsByValue['true'];
    if (optional === undefined) return 0;
    return optional;
  }
}, {
  name: 'belowSpO2TargetRangeDuration',
  description: 'Total duration in which SpO2 was above the target range',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalSegmentations.belowSpO2TargetRange.summary.totalDurationsByValue['true'];
    if (optional === undefined) return 0;
    return optional;
  }
}, {
  name: 'inFiO2TargetRangeDuration',
  description: 'Total duration in which FiO2 was inside the optimal range',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalSegmentations.inFiO2TargetRange.summary.totalDurationsByValue['true'];
    if (optional === undefined) return 0;
    return optional;
  }
}, {
  name: 'inFiO2TargetRangeStartTime',
  description: 'Time when FiO2 first became inside the optimal range',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalSegmentations.inFiO2TargetRange.summary.initialSegmentsByValue['true'];
    if (optional === undefined) return NaN;
    return optional.start;
  }
}, {
  name: 'aboveFiO2TargetRangeDuration',
  description: 'Total duration in which FiO2 was above the target range',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalSegmentations.aboveFiO2TargetRange.summary.totalDurationsByValue['true'];
    if (optional === undefined) return 0;
    return optional;
  }
}, {
  name: 'belowFiO2TargetRangeDuration',
  description: 'Total duration in which FiO2 was above the target range',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalSegmentations.belowFiO2TargetRange.summary.totalDurationsByValue['true'];
    if (optional === undefined) return 0;
    return optional;
  }
}, {
  name: 'spO2SignedErrorIntegral',
  description: 'Total integral of the signed error from the target SpO2 range',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalIntegrations.signedDistanceFromSpO2TargetRange.data;
    if (optional === undefined) return 0;
    return optional;
  }
}, {
  name: 'spO2UnsignedErrorIntegral',
  description: 'Total integral of the unsigned error from the target SpO2 range',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalIntegrations.unsignedDistanceFromSpO2TargetRange.data;
    if (optional === undefined) return 0;
    return optional;
  }
}, {
  name: 'spO2SquaredErrorIntegral',
  description: 'Total integral of the unsigned error from the target SpO2 range',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalIntegrations.squaredDistanceFromSpO2TargetRange.data;
    if (optional === undefined) return 0;
    return optional;
  }
}, {
  name: 'fiO2LargeAdjustments',
  description: 'Total number of times FiO2 changed region',
  extractor: function(analysisResults) {
    var optional = analysisResults.signalSegmentations.fiO2Region.summary.numSegments;
    if (optional === undefined) return 0;
    return optional;
  }
}];

var argv = minimist(process.argv.slice(2));
var inputRootDir = argv['_'][0];
var outputPath = path.join(inputRootDir, 'features.csv');
var descriptionPath = path.join(inputRootDir, 'features.txt');
var allInputPaths = [];
walker(inputRootDir)
  .on('file', function(file) {
    if (file.endsWith('_analyzed.json')) {
      allInputPaths.push(file);
    }
  })
  .on('error', function(err, entry) {
    throw err;
  })
  .on('end', function() {
    console.log('Discovered all analysis result files.');
    processAllInputs(allInputPaths);
  });

function processAllInputs(allInputs) {
  saveAllFeatures(allInputs.map(function(inputPath) {
    console.log('Loading analysis results from \'' + inputPath + '\'');
    return extractFeatures(jsonfile.readFileSync(inputPath));
  }));
}

function saveAllFeatures(allFeatures) {
  console.log('Saving extracted features to \'' + outputPath + '\'');
  var csv = json2csv({
    data: allFeatures,
    fields: _.map(kFeatureExtractors, 'name')
  });
  fs.writeFile(outputPath, csv, function(err) {
    if (err) throw err;
  });
  featureDescriptions = _.reduce(kFeatureExtractors, function(result, featureExtractor) {
      return result + featureExtractor.name + ': ' + featureExtractor.description + '\n';
  }, '');
  fs.writeFile(descriptionPath, featureDescriptions, function(err) {
    if (err) throw err;
  });
}

function extractFeatures(analysisResults) {
  return _.fromPairs(kFeatureExtractors.map(function(extractor) {
    return [extractor.name, extractor.extractor(analysisResults)];
  }));
}

