var config = require('./config')
  , express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , epics = require('epics')
  , io = require('socket.io').listen(config.sioPort);

var app = express();

app.configure(function(){
  app.set('port', config.mainPort);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', {layout: true})
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(function(req, res, next) {
    req.config = config;
    next();
  });
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);

var pvs = {};

function removePV(pvName) {
  var pvInfo = pvs[pvName];
  if(pvInfo) {
    pvInfo.watchers -= 1;
    if(pvInfo.watchers === 0) {
      // TODO: Clear channel
    }
  }
}

function addPV(pvName) {
  var pvInfo = pvs[pvName];
  if(pvInfo) {
    pvInfo.watchers += 1;
  } else {
    var pv = new epics.Channel(pvName);
    pv.on('value', function(data) {
      console.log(data);
      io.sockets.emit('value', {pvName: pv.pvName, value:  data});
    });
    pv.connect(function(err) {
      console.log('connect:', err);
      if(!err) {
        pv.monitor();
      }
    });
    pvs[pvName] = {
      watchers: 1,
      pv: pv
    };
  }
}

io.sockets.on('connection', function(socket) {
  socket.on('change pv name', function(data) {
    removePV(data['prevPVName']);
    addPV(data['newPVName']);
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
