var epics = require('epics')
  , http = require('http')
  , sio = require('socket.io');

var server = http.createServer(function(request, response) {
  if(request.url === '/favicon.ico') {
    response.writeHead(200, {'Content-Type': 'image/x-icon'});
    response.end();
  } else if(request.url === '/') {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end('Try /<PV>');
  } else {
    response.writeHead(200, {'Content-Type': 'text/html'});
    var pvName = request.url.substring(1);
    var page = '<!DOCTYPE html>' +
               '<html>' + 
               '  <head>' +
               '    <script src="/socket.io/socket.io.js"></script>' +
               '    <script>' +
               '      var socket = io.connect();' +
               '      socket.emit("subscribe", "' + pvName + '");' +
               '      socket.on("value", function(data) {' +
               '        document.body.innerHTML += data + "<br>";' +
               '      });' +
               '    </script>' +
               '  </head>' +
               '  <body></body>' +
               '</html>';
    response.end(page);
  }
});

var pvs = {};

function addPV(pvName) {
  var pv = new epics.Channel(pvName);
  pv.on('value', function(value) {
    io.sockets.in(pvName).emit('value', value);
  });
  pv.connect(function(err) {
    pv.monitor();
  });
  pvs[pvName] = pv;
}

function removePV(pvName) {
  pvs[pvName].disconnect();
  delete pvs[pvName];
}

var io = sio.listen(server, {'log level': 1});
io.sockets.on('connection', function(socket) {
  socket.on('subscribe', function(pvName) {
    socket.join(pvName);
    socket.set('pvName', pvName);
    if (!(pvName in pvs)) {
      addPV(pvName);
    }
  });
  socket.on('disconnect', function() {
    socket.get('pvName', function(err, pvName) {
      // Check if disconnecting user is the
      // last subscriber to the pv
      if(io.sockets.clients(pvName).length === 1) {
        removePV(pvName);
      }
    });
  });
});

server.listen(7000);
