var central = require('./central.js')

var stream = central({
  serviceUuid: '13333333333333333333333333333337'
})

process.stdin.pipe(stream).pipe(process.stdout)
