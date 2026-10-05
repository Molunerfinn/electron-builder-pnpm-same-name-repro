// Lists top-level node_modules packed into app.asar and checks the expected production deps are present.
const fs = require('fs')
const path = require('path')
const asar = require('@electron/asar')

const dist = path.join(__dirname, 'dist')
const asarPath = fs.readdirSync(dist, { recursive: true }).map(p => path.join(dist, p)).find(p => p.endsWith(path.join('resources', 'app.asar')) || p.endsWith(path.join('Resources', 'app.asar')))
if (!asarPath) throw new Error('app.asar not found, run `pnpm run dist` first')

const packed = new Set(asar.listPackage(asarPath).map(f => f.split(path.sep).join('/')).map(f => (f.match(/^\/node_modules\/((@[^/]+\/)?[^/]+)\/package\.json$/) || [])[1]).filter(Boolean))
const expected = ['debug', 'lodash', 'ms']
console.log('asar:', asarPath)
console.log('packed node_modules:', [...packed].sort().join(', ') || '(none)')
const missing = expected.filter(m => !packed.has(m))
if (missing.length) {
  console.error('MISSING:', missing.join(', '))
  process.exit(1)
}
console.log('OK: all expected deps are packed')
