/*jshint
  browser: false,
  node: true,
  globalstrict: true
*/
/*global exports: true */

'use strict';

var Request = require(__dirname + '/request');


exports = module.exports = Response;


function Response (req, data) {
    this.magic = [0x67, 0x44, 0x66, 0x98];

    if (!req instanceof Request) {
        throw new Error('First argument is expected to be an instance of Request()');
    }

    if (!data) {
        data = new Buffer(0);
    }

    this.buf = new Buffer(4 + 4 + 8 + data.length); // Magic + errors + handle + data
    this.buf.fill(0x00);
    new Buffer(this.magic).copy(this.buf, 0);
    // Error codes has not been implemented yet - 4 bytes
    req.handle.copy(this.buf, 8);
    data.copy(this.buf, 16);
}
