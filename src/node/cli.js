import path from 'node:path'
import { readFileSync } from 'node:fs'
import { cac } from 'cac'
import pc from 'picocolors'
import { scaffold } from './scaffold.js'
import { startLab } from './server.js'

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
const cli = cac('design-lab')

cli
  .command('[dir]', 'Start the lab for a project (defaults to the current directory)')
  .option('--port <port>', 'Port to listen on', { default: 5199 })
  .option('--host [host]', 'Expose the lab on the network')
  .option('--open', 'Open the lab in the browser')
  .action(async (dir, options) => {
    const projectDir = path.resolve(dir ?? '.')
    await initLab(projectDir)
    await startLab(projectDir, options)
  })

cli
  .command('init [dir]', 'Create .design-lab/ without starting the server')
  .action(async (dir) => {
    await initLab(path.resolve(dir ?? '.'))
  })

async function initLab(projectDir) {
  const { created, labDir } = await scaffold(projectDir)
  const rel = path.relative(process.cwd(), labDir) || labDir
  if (created) console.log(`${pc.green('✔')} Created ${pc.cyan(rel)}`)
}

cli.help()
cli.version(pkg.version)

try {
  cli.parse(process.argv, { run: false })
  await cli.runMatchedCommand()
} catch (err) {
  console.error(pc.red(err?.stack ?? String(err)))
  process.exit(1)
}
