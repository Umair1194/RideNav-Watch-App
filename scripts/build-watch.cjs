const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const Module = require('node:module')
const { spawn } = require('node:child_process')
const root = path.resolve(__dirname, '..')
const cliRoot = path.dirname(require.resolve('@zeppos/zeus-cli/package.json'))

if (process.argv[2] === '--compile') {
  process.chdir(process.argv[3])
  process.env.NODE_PATH = [path.join(cliRoot, 'private-modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter)
  Module._initPaths()
  require('module-alias/register')
  require(path.join(cliRoot, 'modules/build.js')).buildProd({ _: ['build'] }).then(result => {
    process.exit(result ? 0 : 1)
  }).catch(error => { console.error(error.message); process.exit(1) })
} else {
  // Zeus copies the project before compiling. Stage only watch sources so that
  // Android signing files, relay tooling, and nested dependency trees never enter
  // intermediate products or slow down a watch build.
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'ridenav-watch-'))
  for (const file of ['app.js', 'app.json', 'package.json']) fs.copyFileSync(path.join(root, file), path.join(stage, file))
  for (const folder of ['pages', 'app-side', 'shared', 'setting', 'assets', 'fixtures']) {
    fs.cpSync(path.join(root, folder), path.join(stage, folder), { recursive: true, filter: source => {
      const name = path.basename(source)
      return !name.startsWith('.') && !name.includes('.private.') && !name.includes('.local.') && name !== 'relay-config.example.js'
    } })
  }
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(stage, 'node_modules'), 'dir')
  const child = spawn(process.execPath, [__filename, '--compile', stage], { cwd: stage, stdio: 'inherit', env: process.env })
  const watchdog = setTimeout(() => { console.error('Watch build timed out; check Zepp metadata access.'); child.kill('SIGTERM') }, 120000)
  child.on('error', error => { console.error(error.message) })
  child.on('close', code => {
    clearTimeout(watchdog)
    try {
      if (code === 0) {
        fs.mkdirSync(path.join(root, 'dist'), { recursive: true })
        for (const file of fs.readdirSync(path.join(stage, 'dist')).filter(file => file.endsWith('.zab'))) {
          fs.copyFileSync(path.join(stage, 'dist', file), path.join(root, 'dist', file))
          console.log(`Built watch package: ${file}`)
        }
      }
    } finally { fs.rmSync(stage, { recursive: true, force: true }) }
    process.exit(code === 0 ? 0 : 1)
  })
}
