var _ = require('lodash');
var promptly = require('promptly');

var kScenarioEnd = 250;

module.exports = {
  analyze: function(results, tracing, done) {
    var timeMeasurements = {};
    var intervalMeasurements = {
      supplyingOxygen: {
        description: 'Intervals during which oxygen saturation is responding to oxygen delivered by the T-piece (for PPV or CPAP)',
        data: []
      },
      oxygenSupplyInterrupted: {
        description: 'Intervals after PPV during which the infant has stopped receiving oxygen from the T-piece',
        data: []
      }
    };

    var simulationStart = measureBasicEvents(timeMeasurements, intervalMeasurements, tracing.events);
    results.intervalMeasurements = intervalMeasurements;
    measureManualEvents(timeMeasurements, function(timeMeasurements) {
      results.timeMeasurements = timeMeasurements;
      done(results);
    });
  }
}

function measureBasicEvents(timeMeasurements, intervalMeasurements, events) {
  var simulationStart;

  var eventHandlers = {
    'timer-initialized': function(event) {
      if (simulationStart !== undefined) {
        throw {name: 'Repeated simulation initialization', data: event};
      }
      simulationStart = event.time;
      console.log('Apgar timer initialized at', simulationStart + 's');
    },
    'delayed-sensor-connection-timer-started': function(event) {
      measureTimeToUniqueEvent(timeMeasurements, 'sensorPlaced',
        'Time until oxygen saturation sensor was placed on infant',
        simulationStart, event
      );
    },
    'delayed-sensor-connection-timer-completed': function(event) {},
    'sensor-connection': function(event) {
      measureTimeToUniqueEvent(timeMeasurements, 'signalAcquired',
        'Time until oxygen saturation sensor signal became available',
        simulationStart, event
      );
    },
    'intervention-started': function(event) {
      interventionHandlers[event.interventionName].started(event);
    },
    'intervention-response-started': function(event) {
      interventionHandlers[event.interventionName].responseStarted(event);
    },
    'intervention-response-interrupted': function(event) {
      interventionHandlers[event.interventionName].responseInterrupted(event);
    },
    'intervention-response-resumed': function(event) {
      interventionHandlers[event.interventionName].responseResumed(event);
    },
    'intervention-response-stopped': function(event) {
      interventionHandlers[event.interventionName].responseStarted(event);
    }
  };
  var interventionHandlers = {
    'ppv': {
      started: function(event) {
        measureTimeToUniqueEvent(timeMeasurements, 'ppvStarted',
          'Time until positive pressure ventilation was started', simulationStart, event
        );
      },
      responseStarted: function(event) {
        measureTimeToUniqueEvent(timeMeasurements, 'ppvResponseStarted',
          'Time until vital signs started responding to FiO2 from positive pressure ventilation',
          simulationStart, event
        );
        startInterval(intervalMeasurements.supplyingOxygen.data, simulationStart, event);
      },
      responseInterrupted: function(event) {
        endInterval(intervalMeasurements.supplyingOxygen.data, simulationStart, event);
        startInterval(intervalMeasurements.oxygenSupplyInterrupted.data, simulationStart, event);
      },
      responseResumed: function(event) {
        startInterval(intervalMeasurements.supplyingOxygen.data, simulationStart, event);
        endInterval(intervalMeasurements.oxygenSupplyInterrupted.data, simulationStart, event);
      }
    },
    'intubation': {
      started: function(event) {
        measureTimeToUniqueEvent(timeMeasurements, 'intubation',
          'Time until intubation was started', simulationStart, event
        );
      }
    },
    'cc': {
      started: function(event) {
        measureTimeToUniqueEvent(timeMeasurements, 'ccStarted',
        'Time until chest compressions were started', simulationStart, event
        );
      },
      responseStarted: function(event) {
        measureTimeToUniqueEvent(timeMeasurements, 'ccResponseStarted',
          'Time until vital signs started responding to chest compressions',
          simulationStart, event
        );
      }
    },
    'uvc': {
      started: function(event) {
        measureTimeToUniqueEvent(timeMeasurements, 'intubation',
          'Time until umbilical vein catheterization was started', simulationStart, event
        );
      }
    }
  }

  console.log('AUTOMATIC EVENT MEASUREMENTS');
  events.forEach(function(event) {
    try {
      eventHandlers[event.name](event);
    } catch (e) {
      console.log('Ignored event', event);
    }
  });
  console.log('');

  console.log('AUTOMATIC INTERVAL MEASUREMENTS');
  _.forOwn(intervalMeasurements, function(intervalType) {
    console.log(intervalType.description + ':', intervalType.data);
  });
  console.log('');

  return simulationStart;
}

function measureManualEvents(measurements, done) {
  console.log('MANUAL EVENT MEAUREMENTS');
  promptly.prompt('CAPE video recording timestamp of when Apgar timer started at 00:10, in seconds: ',
    {
      default: '',
      validator: validateOptionalTime
    },
    function(err, value) {
      if (value === null) {
        done(measurements);
        return;
      }
      var startTime = value;
      promptly.prompt('CAPE video recording timestamp of when CC stopped, in seconds: ',
        {
          default: '',
          validator: validateOptionalTime
        },
        function(err, value) {
          if (value === null) {
            console.log('');
            done(measurements)
            return;
          }
          measureTimeToUniqueEvent(measurements, 'ccStopped',
            'Time until chest compressions were stopped', startTime, {time: value}
          );
          done(measurements);
        }
      );
    }
  );
}

function validateOptionalTime(value) {
  if (value === '') return null;
  var validated = parseInt(value);
  if (isNaN(validated)) throw new Error('Invalid time');
  return validated;
}

function measureTimeToUniqueEvent(measurements, name, description, offset, event) {
  if (measurements[name] !== undefined) {
    throw {name: 'Repeated occurrence of supposedly unique event', data: event};
  }
  if (offset === undefined) {
    throw {
      name: 'Uninitialized time offset for measurement of time until occurrence of event',
      data: event
    };
  }
  var measurement = {
    description: description,
    time: event.time - offset
  };
  console.log(description + ':', measurement.time + 's');
  measurements[name] = measurement;
}

function startInterval(intervals, offset, event) {
  var interval = {
    start: event.time - offset,
    end: kScenarioEnd,
  };
  interval.duration = interval.end - interval.start;
  intervals.push(interval);
}
function endInterval(intervals, offset, event) {
  var interval = intervals[intervals.length - 1];
  interval.end = event.time - offset;
  interval.duration = interval.end - interval.start;
}

