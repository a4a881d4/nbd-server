/*jshint
  browser: false,
  node: true,
  globalstrict: true
*/
/*global exports: true */

'use strict';


exports = module.exports = Request;


function Request (req) {
    this.req    = {};
    this.magic  = '';
    this.mode   = '';
    this.handle = {};
    this.from   = {};
    this.len    = 0;
    this.data   = {};

    if (!Buffer.isBuffer(req.data)) {
        throw new Error('Request expect to get a buffer as a parameter');
    }

    this.req = req.data;
    this.offset = 0;
    this.complete = 0;
    this.parse(req);
}


Request.prototype.parse = function (unread) {
  if( unread.len>= 28 ) {
    this.magic = this.req.slice(0, 4).toString('hex');
    this.mode = this.parse_mode(this.req.slice(4, 8));
    this.handle = this.req.slice(8, 16);
    this.from = this.parse_from(this.req.slice(16, 24));
    this.len = this.req.readUInt32BE(24);
    var eat = 28;
    if (this.magic !== '25609513') {
        throw new Error('Incorrect client magic received');
    }
    if (this.mode === 'write') {
        this.data = this.req.slice(28);
        eat += this.len;
    }
    if( eat<=unread.len ) {
      this.complete = 1;
      unread.len-=eat;
      unread.data = unread.data.slice(eat);
    }
  }else {
    this.complete=0;
  }
};


Request.prototype.parse_mode = function (mode) {
    switch (mode.toString('hex')) {
        case '00000000':
            return 'read';
        case '00000001':
            return 'write';
        case '00000002':
            return 'disconnect';
        case '00000003':
            return 'flush';
        case '00000004':
            return 'trim';
        default:
            throw new Error('Unknown request type received: ' + mode.toString('hex'));
    }
};


Request.prototype.parse_from = function (from) {
    // Buffer.readUInt32BE() can only read 4 bytes at a time, but 'from' is 8 bytes
    var upper8BytesPlusLower8Bytes = (from.readUInt32BE(0) * 4294967295) + from.readUInt32BE(4);
    return upper8BytesPlusLower8Bytes;
};
