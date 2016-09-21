var path = require('path');
var jsonfile = require('jsonfile');
var minimist = require('minimist');
var _ = require('lodash');
var prompt = require('prompt-sync')();

var eventAnalyzer = require('./eventAnalyzer');

var argv = minimist(process.argv.slice(2));
var inputPath = argv['_'][0];
console.log('Loading tracing from \'' + inputPath + '\'');

jsonfile.readFile(inputPath, function(err, tracing) {
  if (err) throw err;
  var results = {};
  analyzeMetadata(results, tracing);
  analyzeClientList(results, tracing);
  eventAnalyzer.analyze(results, tracing, saveResults);
});

function saveResults(results) {
  var outputPath = path.join(
    path.dirname(inputPath),
    path.basename(inputPath, '.json') + '_analyzed.json'
  );
  console.log('Saving analysis results to \'' + outputPath + '\'');
  jsonfile.writeFile(outputPath, results, {spaces: 2}, function(err) {
    if (err) throw err;
  });
}

function analyzeMetadata(results, tracing) {
  console.log('METADATA');
  console.log('Scenario started at', (new Date(tracing.startTime.iso).toLocaleString()));
  var id = prompt('What is the full (patient+scenario) id of this tracing? ');
  results.id = id;
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

