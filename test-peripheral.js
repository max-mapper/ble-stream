var peripheral = require('./peripheral.js')

var stream = peripheral({
  serviceUuid: '13333333333333333333333333333337',
  characteristicUuid: '13333333333333333333333333330002',
  descriptorUuid: '2901',
  descriptorValue: 'Send or receive data.'
})

process.stdin.pipe(stream).pipe(process.stdout)

process.stdin.on('end', function () {
  process.exit(0)
})
