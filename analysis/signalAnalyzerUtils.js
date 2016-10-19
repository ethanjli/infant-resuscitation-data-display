module.exports = {};
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
