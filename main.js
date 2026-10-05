const { app } = require('electron')
const debug = require('debug')
const lodash = require('lodash')
const ms = require('ms')

app.whenReady().then(() => {
  console.log('debug:', typeof debug, '| lodash:', typeof lodash, '| ms:', typeof ms)
  app.quit()
})
