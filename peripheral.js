var util = require('util')
var bleno = require('bleno')
var through = require('through2')
var duplex = require('duplexify')
var debug = require('debug')('ble-peripheral-stream')

module.exports = function (opts) {
  var incoming = through()
  var outgoing = through()
  var stream = duplex(outgoing, incoming)
  bleno.on('stateChange', function(state) {
    if (state === 'poweredOn') {
      bleno.startAdvertising('BLEStream', [streamService.uuid], function(err) {
        if (err) return stream.destroy(err)
      })
    } else {
      bleno.stopAdvertising()
    }
  })
  
  bleno.on('advertisingStart', function(err) {
    if (!err) {
      bleno.setServices([streamService])
    }
  })

  function StreamService(opts) {
    bleno.PrimaryService.call(this, {
      uuid: opts.serviceUuid || '13333333333333333333333333333337',
      characteristics: [ new StreamDataCharacteristic(opts) ]
    })
  }

  util.inherits(StreamService, bleno.PrimaryService)

  function StreamDataCharacteristic(opts) {
    bleno.Characteristic.call(this, {
      uuid: opts.characteristicUuid || '13333333333333333333333333330002',
      properties: ['read', 'write'],
      descriptors: [
        new bleno.Descriptor({
          uuid: opts.descriptorUuid || '2901',
          value: opts.descriptorValue || 'Send or receive data.'
        })
      ]
    })
  }

  util.inherits(StreamDataCharacteristic, bleno.Characteristic)

  StreamDataCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
    debug('onwrite', {length: data.length, offset: offset})
    if (offset) {
      callback(this.RESULT_ATTR_NOT_LONG)
    } else if (data.length !== 2) {
      callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH)
    } else {
      callback(this.RESULT_SUCCESS)
    }
    incoming.write(data, callback)
  }

  StreamDataCharacteristic.prototype.onReadRequest = function(offset, callback) {
    var self = this
    debug('onread', {offset: offset})
    if (offset) {
      callback(this.RESULT_ATTR_NOT_LONG, null)
    } else {
      var buf = outgoing.read()
      if (!buf) {
        callback(this.RESULT_SUCCESS)
        return
      }
      var bufsize = 100
      if (buf.length > bufsize) {
        var extra = buf.slice(bufsize)
        buf = buf.slice(0, bufsize)
        outgoing.unshift(extra)
      }
      debug('onread response', {length: buf.length})
      callback(self.RESULT_SUCCESS, buf) // send back 2 random bytes
    }
  }
  
  var streamService = new StreamService(opts)  
  return stream
}
