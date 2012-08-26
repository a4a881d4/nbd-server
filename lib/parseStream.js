/*jshint
  browser: false,
  node: true,
  globalstrict: true
*/
/*global exports: true */

'use strict';
var Request = require('./request');
var util = require('util');
var unread={};
unread.data = new Buffer(0);
unread.len = 0;

exports.parse = function(raw) {
  var reqs=[];
  try {
//    util.log("In"+raw.toString('hex'));
    var buf = new Buffer(unread.len + raw.length );
    unread.data.copy(buf,0);
    raw.copy(buf,unread.len);
    unread.len += raw.length; 
    unread.data = buf;
    var k=0;
    while( unread.len>=28 ) {
      util.log("pad:"+unread.data.slice(0,28).toString('hex'));
      var a = new Request(unread);
      if( a.complete == 1 ) {
        reqs[k]=a;
        k++;
      } else {
        break;
      }
    }
  } catch (err) {
    util.log('Error while parsing request: ' + err.message);
  }
  return reqs;
} 

