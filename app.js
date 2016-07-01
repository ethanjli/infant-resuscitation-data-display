var express = require('express');
var http = require('http');

var path = require('path');
var logger = require('morgan');

var app = express();
var port = process.env.PORT || 5000;
var server = http.Server(app);
var socketio = require('socket.io')(server)
server.listen(port, function() {
  console.log('[Server] Listening on port %d in %s mode', port, app.settings.env);
});

//app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'display-panel.html'))
});
app.get('/favicon.ico', function(req, res) {
  res.sendStatus(200);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// production error handler, no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  next(err);
});

var sockets = require('./lib/sockets');
socketio.on('connection', sockets.connection);
