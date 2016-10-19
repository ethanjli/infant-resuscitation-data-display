_ = require('lodash');

module.exports = {};

// Annotation mappers
module.exports.inRange = function(value, range) {
  if (isNaN(range.lower) || isNaN(range.upper)) return null;
  return value >= range.lower && value <= range.upper;
};
module.exports.outsideRange = function(value, range) {
  if (isNaN(range.lower) || isNaN(range.upper)) return null;
  return value < range.lower || value > range.upper;
};
module.exports.aboveRange = function(value, range) {
  if (isNaN(range.lower) || isNaN(range.upper)) return null;
  return value > range.upper;
};
module.exports.belowRange = function(value, range) {
  if (isNaN(range.lower) || isNaN(range.upper)) return null;
  return value < range.lower;
};
module.exports.signedDistanceFromRange = function(value, range) {
  if (isNaN(range.lower) || isNaN(range.upper)) return null;
  if (value > range.upper) return value - range.upper;
  if (value < range.lower) return value - range.lower;
  return 0;
};
module.exports.unsignedDistanceFromRange = function(value, range) {
  return Math.abs(module.exports.signedDistanceFromRange(value, range))
};
module.exports.signedDirectionFromRange = function(value, range) {
  if (isNaN(range.lower) || isNaN(range.upper)) return null;
  if (value > range.upper) return 1;
  if (value < range.lower) return -1;
  return 0;
};

// Segmentation
module.exports.segment = function(array) {
  return array.reduce(function(segments, value, index) {
    var currentSegment = segments[segments.length - 1];
    if (currentSegment === undefined || currentSegment.value !== value) {
      currentSegment = {
        value: value,
        length: 1,
        startIndex: index,
        endIndex: index
      };
      segments.push(currentSegment);
      return segments;
    }
    currentSegment.length += 1;
    currentSegment.endIndex += 1;
    return segments;
  }, []);
}
module.exports.numSegmentsByValue = function(segments) {
  var grouped = _.groupBy(segments, 'value');
  return _.mapValues(grouped, 'length');
}
module.exports.numSegmentSamplesByValue = function(segments) {
  var grouped = _.groupBy(segments, 'value');
  return _.mapValues(grouped, function(groupedSegments) {
    return groupedSegments.reduce(function(numSamples, segment) {
      return numSamples + segment.length;
    }, 0);
  });
}
module.exports.initialSegmentsByValue = function(segments) {
  var grouped = _.groupBy(segments, 'value');
  return _.mapValues(grouped, function(groupedSegments) {
    return groupedSegments.reduce(function(initialSegment, segment) {
      if (initialSegment === undefined || segment.startIndex < initialSegment.startIndex) return segment;
      else return initialSegment;
    }, undefined);
  });
}

