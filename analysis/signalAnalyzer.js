var _ = require('lodash');
var spO2Analyzers = require('./spO2SignalAnalyzers');
var fiO2Analyzers = require('./fiO2SignalAnalyzers');

module.exports = {
  analyze: function(results, tracing) {
    var annotations = {};
    annotations.apgarTime = {
      description: 'Apgar time',
      data: tracing.samples.time
    };
    annotateSpO2Mean(annotations, tracing, results.clients.controlPanel);
    console.log('Annotated SpO2 signal.');
    annotateFiO2(annotations, tracing, results.clients.controlPanel);
    console.log('Annotated FiO2 signal.');
    results.signalAnnotations = annotations;
  }
}

function annotateSpO2Mean(annotations, tracing, controlPanelType) {
  [
    spO2Analyzers.inTargetRange, spO2Analyzers.outsideTargetRange,
    spO2Analyzers.aboveTargetRange, spO2Analyzers.belowTargetRange,
    spO2Analyzers.signedDistanceFromTargetRange, spO2Analyzers.unsignedDistanceFromTargetRange,
    spO2Analyzers.signedDirectionFromTargetRange,
    spO2Analyzers.generateRegion(controlPanelType)
  ]
    .forEach(annotateWithMapper.bind(undefined, annotations, tracing.samples));
}
function annotateFiO2(annotations, tracing, controlPanelType) {
  [
    'generateInTargetRange', 'generateOutsideTargetRange',
    'generateAboveTargetRange', 'generateBelowTargetRange',
    'generateSignedDistanceFromTargetRange', 'generateUnsignedDistanceFromTargetRange',
    'generateSignedDirectionFromTargetRange',
    'generateRegion'
  ]
    .map(function(generator) {
      return fiO2Analyzers[generator](controlPanelType);
    })
    .forEach(annotateWithMapper.bind(undefined, annotations, tracing.samples));
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
