var express = require('express');
var http = require('http');

var path = require('path');
var debug = require('debug')('infant-resuscitation-data-display:server');
var logger = require('morgan');

var app = express();
var port = process.env.PORT || 5000;
var server = http.Server(app);
var io = require('socket.io')(server)
server.listen(port, function() {
  console.log('Listening on port %d in %s mode', port, app.settings.env);
});

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
  res.sendfile(path.join(__dirname, '/display-panel.html'))
});
app.get('/favicon.ico', function(req, res) {
  res.send(200);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler, will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    next(err);
  });
}
// production error handler, no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  next(err);
});


module.exports = app;

io.on('connection', function(socket) {
  console.log('A new client connected!');
  socket.emit('update', {
    time: '00:10',
    spo2: 0.42,
    fio2: 0.20,
  });
  socket.on('connected', function(data) {
    console.log('The client that connected is a ' + data.client + '.');
  })
});
