/**
 * Module which extracts the text out of an electronic pdf file
 * This module can handle multi-page pdf files

 */
var sys = require('util');
var events = require('events');
var fs = require('fs');
var async = require('async');
var split = require('./split.js');
var convert = require('./convert.js');
var pathHash = require('pathhash');
var ocr = require('./ocr.js');
var rimraf = require('rimraf');


function Raw(){
  if(false === (this instanceof Raw)) {
    return new Raw();
  }
}
sys.inherits(Raw, events.EventEmitter);
module.exports = Raw;


/**
 * @param {String} pdf_path path to the pdf file on disk
 * @param {Boolean} params.clean true to remove the temporary single-page pdf
 *   files from disk. Sometimes however you might want to be able to use those
 *   single page pdfs after the ocr completes. In this case pass clean = false
 *
 * @return {Array} text_pages an array of the extracted text where
 *   each entry is the text for the page at the given index
 * @return callback(<maybe error>, text_pages)
 */
Raw.prototype.process = function(pdf_path, options) {
  var self = this;
  var split_output;
  if (!options) {
    options = {};
  }
  // default to removing the single page pdfs after ocr completes
  if (!options.hasOwnProperty('clean')) {
    options.clean = true;
  }
  fs.exists(pdf_path, function (exists) {
    if (!exists) {
      var err = 'no file exists at the path you specified: ' + pdf_path
      self.emit('error', { error: err, pdf_path: pdf_path});
      return
    }
    pathHash(pdf_path, function (err, hash) {
      if (err) {
        err = 'error hashing file at the path you specified: ' + pdf_path + '. ' + err;
        self.emit('error', { error: err, pdf_path: pdf_path});
        return;
      }

      var quality = 300;
      if (options.hasOwnProperty('quality') && options.quality) {
        quality = options.quality;
      }
      convert(pdf_path, quality, function (err, tif_path) {
        if (err) { return err }
        var ocr_flags = [
          '-psm 6'
        ];
        if (options.ocr_flags) {
          ocr_flags = options.ocr_flags;
        }
        ocr(tif_path, ocr_flags, function (err, extract) {
          fs.unlink(tif_path, function (tif_cleanup_err, reply) {
            if (tif_cleanup_err) {
              err += ', error removing temporary tif file: "'+tif_cleanup_err+'"';
            }
            if (err) { return err; }
            self.emit('complete', { pdf_path: pdf_path} );
          });
        });
      });
    });
  });
}
