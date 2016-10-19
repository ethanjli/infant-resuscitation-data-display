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
    analyzeSpO2Mean(annotations, segmentations, tracing, results.clients.controlPanel);
    analyzeFiO2(annotations, segmentations, tracing, results.clients.controlPanel);
    results.signalAnnotations = annotations;
    results.signalSegmentations = segmentations;
    console.log('');
  }
}

function analyzeSpO2Mean(annotations, segmentations, tracing, controlPanelType) {
  var annotators = [
    spO2Analyzers.inTargetRange, spO2Analyzers.outsideTargetRange,
    spO2Analyzers.aboveTargetRange, spO2Analyzers.belowTargetRange,
    spO2Analyzers.signedDistanceFromTargetRange, spO2Analyzers.unsignedDistanceFromTargetRange,
    spO2Analyzers.signedDirectionFromTargetRange,
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
  segmentation = utils.segment(annotation.data)
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

