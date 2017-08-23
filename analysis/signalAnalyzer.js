var _ = require('lodash');
var utils = require('./signalAnalyzerUtils');
var spO2Analyzers = require('./spO2SignalAnalyzers');
var fiO2Analyzers = require('./fiO2SignalAnalyzers');

var kSegmentMinDuration = 4;
var kMinStartTime = 0;
var kMaxEndTime = 240;

module.exports = {
  analyze: function(results, tracing) {
    console.log('SIGNAL ANALYSIS');
    var annotations = {};
    annotations.apgarTime = {
      description: 'Apgar time',
      data: tracing.samples.time
    };
    annotations.scenarioTime = {
      description: 'Time relative to when the scenario started',
      data: tracing.samples.time.map(function(sample) {
        return sample + results.timeMeasurements.scenarioStarted.time;
      })
    }
    var segmentations = {};
    var integrations = {};
    analyzeSpO2Mean(annotations, segmentations, integrations,
      tracing, results.clients.controlPanel);
    analyzeFiO2(annotations, segmentations, tracing, results.clients.controlPanel);
    results.signalAnnotations = annotations;
    results.signalSegmentations = segmentations;
    results.signalIntegrations = integrations;
    console.log('');
  }
}

function analyzeSpO2Mean(annotations, segmentations, integrations, tracing, controlPanelType) {
  var annotators = [
    spO2Analyzers.inTargetRange, spO2Analyzers.outsideTargetRange,
    spO2Analyzers.aboveTargetRange, spO2Analyzers.belowTargetRange,
    spO2Analyzers.signedDistanceFromTargetRange, spO2Analyzers.unsignedDistanceFromTargetRange,
    spO2Analyzers.squaredDistanceFromTargetRange, spO2Analyzers.signedDirectionFromTargetRange,
    spO2Analyzers.generateRegion(controlPanelType)
  ];
  annotators.forEach(annotateWithMapper.bind(undefined, annotations, tracing.samples));
  console.log('Annotated SpO2 signal.');
  var segmenters = [
    spO2Analyzers.inTargetRange, spO2Analyzers.outsideTargetRange,
    spO2Analyzers.aboveTargetRange, spO2Analyzers.belowTargetRange,
    spO2Analyzers.signedDirectionFromTargetRange,
    spO2Analyzers.generateRegion(controlPanelType)
  ];
  segmenters.forEach(segmentAnnotation.bind(undefined, annotations, segmentations));
  console.log('Segmented SpO2 signal annotations.');
  var integrators = [
    spO2Analyzers.signedDistanceFromTargetRange, spO2Analyzers.unsignedDistanceFromTargetRange,
    spO2Analyzers.squaredDistanceFromTargetRange
  ];
  integrators.forEach(integrateAnnotation.bind(undefined, annotations, integrations));
  console.log('Integrated SpO2 signal annotations.');
}
function analyzeFiO2(annotations, segmentations, tracing, controlPanelType) {
  var annotators = [
    'generateInTargetRange', 'generateOutsideTargetRange',
    'generateAboveTargetRange', 'generateBelowTargetRange',
    'generateSignedDistanceFromTargetRange', 'generateUnsignedDistanceFromTargetRange',
    'generateSignedDirectionFromTargetRange',
    'generateRegion'
  ]
    .map(function(generator) {
      return fiO2Analyzers[generator](controlPanelType);
    });
  annotators.forEach(annotateWithMapper.bind(undefined, annotations, tracing.samples));
  console.log('Annotated FiO2 signal.');
  var segmenters = [
    'generateInTargetRange', 'generateOutsideTargetRange',
    'generateAboveTargetRange', 'generateBelowTargetRange',
    'generateSignedDirectionFromTargetRange', 'generateRegion'
  ]
    .map(function(generator) {
      return fiO2Analyzers[generator](controlPanelType);
    });
  segmenters.forEach(segmentAnnotation.bind(undefined, annotations, segmentations))
  console.log('Segmented FiO2 signal annotations.');
}

function mapTimeseries(times, values, mapper) {
  if (times.length !== values.length) {
    throw {
      name: 'Mismatch between number of time points and number of timeseries samples',
      data: {numTimePoints: times.length, numSamples: samples.length}
    };
  }
  return _.zip(times, values).map(function(samplePair) {
    return mapper(samplePair[0], samplePair[1]);
  });
}

function annotateWithMapper(annotations, samples, annotator) {
  annotations[annotator.name] = {
    description: annotator.description,
    data: mapTimeseries(samples.time, samples[annotator.sourceSignalName], annotator.mapper)
  };
}
function segmentAnnotation(annotations, segmentations, annotator) {
  var annotationName = annotator.name;
  var annotation = annotations[annotationName];
  var time = annotations.scenarioTime.data;
  var segmentation = utils.segment(annotation.data)
    .map(function(segment) {
      segment.start = Math.max(kMinStartTime, time[segment.startIndex]);
      segment.end = Math.min(kMaxEndTime, time[segment.endIndex]);
      segment.duration = segment.end - segment.start;
      return segment;
    })
    .filter(function(segment) {
      return segment.duration >= kSegmentMinDuration;
    });

  segmentations[annotationName] = {
    description: annotation.description,
    data: segmentation,
    summary: {
      numSegments: segmentation.length,
      numSegmentsByValue: utils.numSegmentsByValue(segmentation),
      totalDurationsByValue: utils.totalDurationsByValue(segmentation),
      initialSegmentsByValue: utils.initialSegmentsByValue(segmentation)
    }
  }
}
function integrateAnnotation(annotations, integrations, annotator) {
  var annotationName = annotator.name;
  var annotation = annotations[annotationName];
  var time = annotations.scenarioTime.data;
  var timeDifferences = _.map(time, function(t, i) {
    if (i >= time.length - 1) { // At the last timestamp, the difference is not defined
      return null;
    }
    // Return the time difference to the next timestamp
    return time[i + 1] - t;
  });
  var integration = _.reduce(annotation.data, function(sum, value, i) {
    return sum + value * timeDifferences[i];
  }, 0);
  integrations[annotationName] = {
    description: annotation.description,
    data: integration
  }
}

