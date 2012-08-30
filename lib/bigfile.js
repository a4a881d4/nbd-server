var fs = require('fs');

exports = module.exports = bigfile;

function bigfile( file ) {
  this.filelength = 0;
  this.block=[];
  this.blocksize = 1;
  this.parse( file );
  
  function size() {
    return filelength;
  };
  
  function read( buf, len, from, cb ) {
    var begin = from;
    var end = from+len;
    var s = Math.floor(begin/blocksize);
    var e = Math.floor(end/blocksize);
    if( s+1 == e ) {
      fs.open(block[s], 'r', function (err, fd) {
        if (err) {
          throw new Error('Error while opening file for reading: ' + err.message);
        } else {
          fs.read(fd, buf, 0, blocksize-begin%blocksize, begin%blocksize, function (err, bytesRead, buffer) {
            if (err) {
              throw new Error('Error while reading: ' + err.message);
            } else {
              fs.open(block[s], 'r', function (err, fd) {
                if (err) {
                  throw new Error('Error while opening file for reading: ' + err.message);
                } else {
                  fs.read(fd, buf, blocksize-begin%blocksize, end%blocksize, 0, function (err, bytesRead, buffer) {
                    if(err) {
                      throw new Error('Error while opening file for reading: ' + err.message);
                    } else {
                      cb( err, len, buf );
                    }
                  });
                }
              });
            }
          });
        }
      });
    } else {
      fs.open(block[s], 'r', function (err, fd) {
        if (err) {
          throw new Error('Error while opening file for reading: ' + err.message);
        } else {
          fs.read(fd, buf, 0, len, begin%blocksize, function (err, bytesRead, buffer) {
            if (err) {
              throw new Error('Error while reading: ' + err.message);
            } else {
              cb( err, len, buf );
            }
          });
        }
      });
    }
  }
};
   
bigfile.prototype.parse = function ( file ) {
  fs.readFile(file, function( err, buf ) {
    if( err ) {
      throw new Error("read file error");
    } else {
      this = JSON.parse( buf );
    }
  });
};
