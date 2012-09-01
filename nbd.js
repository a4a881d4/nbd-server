/*jshint
  browser: false,
  node: true,
  globalstrict: true
*/

'use strict';


/* Module dependencies */
var util = require('util');
var fs = require('fs');
var commander = require('commander');
var net = require('net');
var BitSet = require('lib/bitset');
var Response = require(__dirname + '/lib/response');
var parseStream = require(__dirname+'/lib/parseStream');

/* Command line parsing */
commander.version('0.0.0');
commander.usage('[options] <file to serve>');
commander.option('-i, --ip [address]', 'IP address to listen on');
commander.option('-p, --port <number>', 'Port to listen on', parseInt);
commander.parse(process.argv);

if (commander.args.length === 0) {
    console.log('You need to supply a file to be served.');
    process.exit(1);
} else if (commander.args.length > 1) {
    console.log('This program can only handle one file at a time for now - ' +
        'Please start multiple instances instead.');
    process.exit(1);
}

var file = commander.args[0];
var bf = require('./lib/bigfile');
bf.parse(file);

if (typeof commander.port !== 'number') {
    console.log('The port to listen on needs to be specified, and has to be a number.');
    process.exit(1);
}

if (!commander.ip) {
    commander.ip = '0.0.0.0';
}

if (net.isIP(commander.ip) === 0) {
    console.log('The IP address provided does not seem to be valid.');
    process.exit(1);
}


/*
  Function which takes an integer and converts it into a Buffer containing the value.
  Optionally takes a second parameter which specifies how large the resulting buffer should be.
*/
var int2buf = function (int, bytes) {
    var hex = int.toString(16);
    if (!bytes) {
        bytes = Math.ceil(hex.length / 2);
    } else if ((hex.length / 2) > bytes) {
        throw new Error(int, 'in hex will consume more than ' + bytes + ' bytes');
    }

    var padding_length = (bytes * 2) - hex.length;
    return new Buffer(new Array(padding_length + 1).join(0) + hex, 'hex');
};


var server = net.createServer();
server.on('listening', function () {
    var ip_print = '';
    if (net.isIPv6(commander.ip)) {
        ip_print = '[' + commander.ip + ']';
    } else {
        ip_print = commander.ip;
    }

    var file_size_mb = Math.round(bf.size() / 10485.76) / 100;

    console.log('Listening on ' + ip_print + ':' + commander.port +
        ' - Serving "' + file + '" (' + file_size_mb + ' MB)\n');
});

server.on('close', function () {
    util.log('Server closing');
});

server.on('error', function (err) {
    util.log('An error occured: ' + err);
});

server.on('connection', function (socket) {
    util.log('New connection from ' + socket.remoteAddress);


    var handshake = new Buffer(152);
    handshake.fill(0x00);

    // NBDMAGIC - 8 bytes
    new Buffer('NBDMAGIC').copy(handshake, 0);

    // Magic number - 8 bytes
    new Buffer([0x00, 0x00, 0x42, 0x02, 0x81, 0x86, 0x12, 0x53]).copy(handshake, 8);

    // File size - 8 bytes
    int2buf(bf.size(), 8).copy(handshake, 16);

    // Flags - 4 bytes
    // Note: BitSet counts bits starting from 1
    var flags = new BitSet();
    flags.set(1); // NBD_FLAG_HAS_FLAGS  - should always be 1
    //flags.set(2); // NBD_FLAG_READ_ONLY  - the export is read-only
    //flags.set(3); // NBD_FLAG_SEND_FLUSH - server supports NBD_CMD_FLUSH commands
    //flags.set(4); // NBD_FLAG_SEND_FUA   - server supports the NBD_CMD_FLAG_FUA flag
    //flags.set(5); // NBD_FLAG_ROTATIONAL - let the client schedule I/O accesses as for a rotational medium
    //flags.set(6); // NBD_FLAG_SEND_TRIM  - server supports NBD_CMD_TRIM commands
    int2buf(flags.store[0], 4).copy(handshake, 24);

    socket.write(handshake);


    // TODO: Handle client requests
    socket.on('data', function (raw) {
        util.log('On Data');
        
        var reqs = parseStream.parse(raw);
        for( var k=0;k<reqs.length;k++ ) {
          var req = reqs[k];
          ( function( req ) {
          switch (req.mode) {
            case 'read':
                var data = new Buffer(req.len);
                bf.read( data, req.len, req.from, function dataRead (err, bytesRead, buffer) {
                   if (err) {
                            // TODO: Send an error message back to the client
                            socket.destroy();
                            throw new Error('Error while reading: ' + err.message);
                        }

                        util.log('Read ' + bytesRead + ' starting from ' + req.from/4096 +':'+req.from%4096 + ' for ' + socket.remoteAddress);
                        var res = new Response(req, buffer);
                        return socket.write(res.buf);
                    });

                break;

            case 'write':
                return socket.destroy();

            case 'disconnect':
                util.log('Disconnect from ' + socket.remoteAddress);
                return socket.end();

            case 'flush':
                break;

            case 'trim':
                util.debug('Client requested to do a trim, but that has not been implemented yet');
                return socket.destroy();
        }
      })(req);
      }
    });

    socket.on('error', function (err) {
        util.log('The following error occured:');
        console.log(err);
    });
});

server.listen(commander.port, commander.ip);
