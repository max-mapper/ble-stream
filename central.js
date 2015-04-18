var noble = require('noble')
var from = require('from2')
var through = require('through2')
var duplexify = require('duplexify')
var debug = require('debug')('ble-central-stream')

var MAX = 256

module.exports = function (opts) {
  return createStream(opts.serviceUuid)
}

function createStream (id) {
  var stream = duplexify()

  var onchange = function (state) {
    if (state === 'poweredOn') {
      noble.startScanning([id], false)
    } else {
      noble.stopScanning()
    }
  }

  var ondiscover = function (peripheral) {
    noble.removeListener('stateChange', onchange)
    noble.removeListener('discover', ondiscover)
    noble.stopScanning()

    peripheral.connect(function (err) {
      if (err) return stream.destroy(err)
      peripheral.discoverServices([id], function (err, services) {
        if (err) return stream.destroy(err)
        services[0].discoverCharacteristics([], function (err, characteristics) {
          if (err) return stream.destroy(err)
          ready(characteristics[0])
        })
      })
    })
  }

  var ready = function (ch) {
    var input = through.obj(function (data, enc, cb) {
      debug('onwrite', {length: data.length})
      var offset = -MAX
      var loop = function (err) {
        if (err) return cb(err)
        if (offset + MAX >= data.length) return cb()
        offset += MAX
        ch.write(data.slice(offset, offset + MAX), true, loop)
      }

      loop()
    })

    var timeout = 200
    var output = from(function (size, cb) {
      setTimeout(function () {
        ch.read(function (err, data) {
          if (err) return cb(err)
          if (!data) return cb(null, null)
          timeout = data.length === 100 ? 1 : 200
          debug('onread', {length: data.length})
          cb(null, data)
        })
      }, timeout)
    })

    stream.setWritable(input)
    stream.setReadable(output)
  }

  noble.on('stateChange', onchange)
  noble.on('discover', ondiscover)

  return stream
}
