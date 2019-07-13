// Js_of_ocaml runtime support
// http://www.ocsigen.org/js_of_ocaml/
// Copyright (C) 2014 Jérôme Vouillon, Hugo Heuzard
// Laboratoire PPS - CNRS Université Paris Diderot
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, with linking exception;
// either version 2.1 of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.

// Provides: fs_fss_supported
function fs_fss_supported () {
  return (typeof joo_global_object.webkitRequestFileSystemSync !== 'undefined'
          || typeof joo_global_object.requestFileSystemSync !== 'undefined')
}

//Provides: MlFssDevice
//Requires: MlFssFile
//Requires: MlFssFile, caml_new_string, caml_create_bytes, caml_string_of_array, caml_raise_no_such_file
var MlFssDevice = function (root) {
  var device = this ;
  this.root = root ;
  this.fs =
    (joo_global_object.webkitRequestFileSystemSync
     || joo_global_object.requestFileSystemSync) (joo_global_object.TEMPORARY, 0) ;
}

MlFssDevice.prototype.nm = function (name) {
  return (this.root + name) ;
}

MlFssDevice.prototype.exists = function (name) {
  try {
    var path = this.nm (name) ;
    this.fs.root.getFile(path, {create: false}) ;
    return 1 ;
  } catch (e) {
    return 0 ;
  }
}

MlFssDevice.prototype.is_dir = function (name) {
  try {
    var path = this.nm (name) ;
    this.fs.root.getDirectory(path, {create: false}) ;
    return 1 ;
  } catch (e) {
    return 0 ;
  }
}

MlFssDevice.prototype.unlink = function (name) {
  try {
    var path = this.nm (name) ;
    (this.fs.root.getFile(path, {create: false})).remove () ;
    return true ;
  } catch (e) {
    return false ;
  }
}

MlFssDevice.prototype.open = function(name, flags) {
  var path = this.nm (name) ;
  try {
    var file = this.fs.root.getFile(path, { create:flags.create, exclusive:flags.excl }) ;
    var contents ;
    if (flags.truncate) {
      contents = caml_create_bytes(0) ;
    } else {
      var f = file.file () ;
      var reader = new joo_global_object.FileReaderSync () ;
      // FIXME: Use reasAsArrayBuffer?
      contents = caml_new_string(reader.readAsBinaryString(f)) ;
    }
    return new MlFssFile (file, contents) ;
  } catch (e) {
    caml_raise_no_such_file (path) ;
  }
}

MlFssDevice.prototype.constructor = MlFssDevice

//Provides: MlFssFile
//Requires: MlFile, MlFakeFile, MlBytes
//Requires: caml_jsbytes_of_string
function MlFssFile(fileEntry, content) {
  this.needSync = false ;
  this.fake = new MlFakeFile(content) ;
  this.fileEntry = fileEntry ;
}
MlFssFile.prototype.truncate = function(len) {
  this.needSync = true ;
  return this.fake.truncate(len) ;
}
MlFssFile.prototype.length = function () {
  return this.fake.length() ;
}
MlFssFile.prototype.read = function (offset, buf, pos, len) {
  this.fake.read (offset, buf, pos, len) ;
}
MlFssFile.prototype.read_one = function (offset) {
  this.fake.read_one (offset) ;
}
MlFssFile.prototype.close = function () {
  if (this.needSync) {
    // FIXME: marshalled data are corrupted (probably here but it could be on open() )
    var bstr = caml_jsbytes_of_string(this.fake.data) ;
    var len = bstr.length ;
    var u8 = new joo_global_object.Uint8Array (len) ;
    for (var i = 0; i < len; i++) { u8[i] = bstr.charCodeAt (i) }
    var blob = new joo_global_object.Blob ([u8], {type:'application/octet-stream'}) ;
    (this.fileEntry.createWriter ()).write (blob) ;
  }
  return (this.fake.close ()) ;
}
MlFssFile.prototype.write = function(offset, buf, pos, len) {
  var res = this.fake.write (offset, buf, pos, len) ;
  this.needSync = true ;
  return res ;
}

MlFssFile.prototype.constructor = MlFssFile