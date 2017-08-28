var path = require('path');
var jsonfile = require('jsonfile');
var minimist = require('minimist');
var walker = require('walker');
var _ = require('lodash');
var prompt = require('prompt-sync')();

var eventAnalyzer = require('./eventAnalyzer');
var signalAnalyzer = require('./signalAnalyzer');

var kFullIDRegex = /[0-9]{8}_P1a_[0-9]+_S[1-4]/;

console.log('FILE LOADING');
var argv = minimist(process.argv.slice(2));
var inputPath = argv['_'][0];
if (inputPath.endsWith('.json')) {
  processInput(inputPath, argv['update']);
} else {
  var allUpdateInputPaths = [];
  var updateMode = argv['update'];
  walker(inputPath)
    .on('file', function(file) {
      if (file.endsWith('_analyzed.json')) {
        allUpdateInputPaths.push(file.slice(0, -1 * '_analyzed.json'.length) + '.json');
      }
    })
    .on('error', function(err, entry) {
      throw err;
    })
    .on('end', function() {
      console.log('Discovered all analyzable files.');
      console.log(allUpdateInputPaths);
      if (updateMode === 'true') {
        if (allUpdateInputPaths.length > 0) {
          console.log('Updating previously analyzed files.');
          allUpdateInputPaths.forEach(_.bind(processInput, undefined, _, updateMode));
        } else {
          console.log('No analysis results to update. Run this script on some individual trackings first.');
        }
      } else {
        console.log('Can only update previous analysis results in a directory.');
      }
    });
}

function processInput(inputPath, updateMode) {
  console.log('Loading tracing from \'' + inputPath + '\'');
  var outputPath = path.join(
    path.dirname(inputPath),
    path.basename(inputPath, '.json') + '_analyzed.json'
  );
  if (updateMode === 'true') {
    console.log('Loading previous analysis results from \'' + outputPath + '\'');
    console.log('');
    jsonfile.readFile(outputPath, function(err, previousResults) {
      if (err) throw err;
      jsonfile.readFile(inputPath, _.bind(
        onReadInputFile, undefined, _, _, previousResults, outputPath)
      );
    });
  } else {
    console.log('');
    jsonfile.readFile(inputPath, _.bind(onReadInputFile, undefined, _, _, _, outputPath));
  }
}

function onReadInputFile(err, tracing, previousResults, outputPath) {
  if (err) throw err;
  var results = {};
  analyzeMetadata(results, tracing, previousResults);
  analyzeClientList(results, tracing, previousResults);
  eventAnalyzer.analyze(results, tracing, function(results) {
    signalAnalyzer.analyze(results, tracing);
    saveResults(results, outputPath);
  }, previousResults);
}

function saveResults(results, outputPath) {
  console.log('SAVING');
  console.log('Saving analysis results to \'' + outputPath + '\'');
  jsonfile.writeFile(outputPath, results, {spaces: 2}, function(err) {
    if (err) throw err;
  });
}

function analyzeMetadata(results, tracing, previousResults) {
  console.log('METADATA');
  console.log('Scenario started at', (new Date(tracing.startTime.iso).toLocaleString()));
  if (previousResults !== undefined) {
    console.log('Using saved full (subject+scenario) id \'' + previousResults.id + '\'');
    results.id = previousResults.id;
  } else {
    results.id = prompt('What is the full (subject+scenario) id of this tracing? ');
  }
  if (kFullIDRegex.test(results.id)) {
    var id_components = results.id.split('_');
    results.subjectNumber = id_components[2];
    console.log('This scenario involves subject ' + results.subjectNumber + '.');
    results.scenarioNumber = id_components[3].slice(1);
    console.log('This is scenario ' + results.scenarioNumber + ' for the subject.');
  } else {
    console.log('Warning: this id does not follow the standard format!');
  }
  console.log('');
}

function analyzeClientList(results, tracing) {
  var clients = {};

  console.log('SCENARIO PARAMETERS');
  var controlPanels = _.intersection(tracing.clients,
    ['extreme-scenario-control-panel', 'ideal-scenario-control-panel']);
  if (controlPanels.length !== 1) {
    throw {name: 'Ambiguous list of control panels', data: controlPanels};
  }
  console.log('Control Panel:', controlPanels[0]);
  clients.controlPanel = controlPanels[0];

  var displayPanels = _.intersection(tracing.clients,
    ['minimal-display-panel', 'display-panel']);
  if (displayPanels.length !== 1) {
    throw {name: 'Ambiguous list of display panels', data: displayPanels};
  }
  console.log('Display Panel:', displayPanels[0]);
  clients.displayPanel = displayPanels[0];
  console.log('');

  results.clients = clients;
}

