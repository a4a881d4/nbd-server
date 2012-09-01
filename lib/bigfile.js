var fs = require('fs')
  , path = require('path')
  , filelength = 0
  , block=[]
  , blocksize = 1
  , dir = ""
  
exports.parse = function ( file ) {
  dir = path.dirname( file );
  var buf = fs.readFileSync(file);
  var p = JSON.parse( buf );
  filelength = p.filelength;
  blocksize = p.blocksize;
  block = p.block;
};
exports.size = function () {
  return filelength;
};

exports.read = function( buf, len, from, cb ) {
  var begin = from;
  var end = from+len;
  var s = Math.floor(begin/blocksize);
  var e = Math.floor((end-1)/blocksize);
  if( s+1 == e ) {
    fs.open(path.join(dir,block[s]), 'r', function (err, fd1) {
      if (err) {
        throw new Error('Error while opening file for reading: ' + err.message);
      } else {
        fs.read(fd1, buf, 0, blocksize-begin%blocksize, begin%blocksize, function (err, bytesRead, buffer) {
          if (err) {
            throw new Error('Error while reading: ' + err.message);
          } else {
            fs.open(path.join(dir,block[s+1]), 'r', function (err, fd2) {
              if (err) {
                throw new Error('Error while opening file for reading: ' + err.message);
              } else {
                fs.read(fd2, buf, blocksize-begin%blocksize, end%blocksize, 0, function (err, bytesRead, buffer) {
                  if(err) {
                    throw new Error('Error while opening file for reading: ' + err.message);
                  } else {
                    cb( err, len, buf );
                    fs.close(fd2);
                    fs.close(fd1);
                  }
                });
              }
            });
          }
        });
      }
    });
  } else {
    fs.open(path.join(dir,block[s]), 'r', function (err, fd) {
      if (err) {
        throw new Error('Error while opening file for reading: ' + err.message);
      } else {
        fs.read(fd, buf, 0, len, begin%blocksize, function (err, bytesRead, buffer) {
          if (err) {
            throw new Error('Error while reading: ' + err.message);
          } else {
            cb( err, len, buf );
            fs.close(fd);
          }
        });
      }
    });
  }
};
  
  
