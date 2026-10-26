import path from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { cac } from 'cac'
import pc from 'picocolors'
import { DEFAULT_PORT, displayPath, locateLab } from './paths.js'
import { scaffold, scaffoldStandalone } from './scaffold.js'
import { startLab } from './server.js'
import { UsageError, formatError } from './errors.js'

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
const cli = cac('design-lab')

cli
  .command('[dir]', 'Start the lab for an app, or a standalone lab (defaults to the current directory)')
  .option('--port <port>', 'Port to listen on', { default: DEFAULT_PORT })
  .option('--host [host]', 'Expose the lab on the network')
  .option('--open', 'Open the lab in the browser')
  .action(async (dir, options) => {
    const { location } = await ensureLab(path.resolve(dir ?? '.'))
    await startLab(location, options)
  })

cli
  .command('init [dir]', 'Create a lab without starting the server')
  .option('--standalone', 'Make the directory a lab of its own, with its own package.json')
  .option('--project <name=path>', 'A project a standalone lab imports from: a path or package name (repeatable)')
  .action(async (dir, options) => {
    const target = path.resolve(dir ?? '.')
    if (!options.standalone) {
      if (options.project) throw new UsageError('--project is for standalone labs: add --standalone, or list projects in lab.config.js.')
      const { location, created } = await ensureLab(target)
      if (!created) console.log(`${pc.yellow('!')} ${pc.cyan(displayPath(location.labDir))} already exists`)
      return
    }
    const { created } = await scaffoldStandalone(target, parseProjects(options.project))
    if (!created) console.log(`${pc.yellow('!')} ${pc.cyan(displayPath(target))} already has a lab`)
    else console.log(`${pc.green('✔')} Created a standalone lab in ${pc.cyan(displayPath(target))}. Run ${pc.cyan('npm install')} there, then ${pc.cyan('npm run design-lab')}.`)
  })

/** The folder's lab, creating `.design-lab/` when it has none (standalone labs are only made by init). */
async function ensureLab(dir) {
  const existing = locateLab(dir)
  if (existing.exists) return { location: existing, created: false }
  const { labDir } = await scaffold(dir)
  console.log(`${pc.green('✔')} Created ${pc.cyan(displayPath(labDir))}`)
  return { location: locateLab(dir), created: true }
}

/**
 * `--project ui=../design-system --project kit=@acme/ui`. Paths are relative to where you are, and
 * anything that exists there counts as one (as a shell user would expect from `ui=design-system`).
 * They are written to lab.config.js relative to the lab, starting with `.`.
 */
function parseProjects(specs = []) {
  return Object.fromEntries(
    [].concat(specs).map((spec) => {
      const [name, ...rest] = String(spec).split('=')
      const target = rest.join('=')
      if (!name || !target) throw new UsageError(`--project expects name=path, got "${spec}"`)
      const isPath = target.startsWith('.') || path.isAbsolute(target) || existsSync(path.resolve(target))
      return [name, isPath ? path.resolve(target) : target]
    }),
  )
}

cli.help()
cli.version(pkg.version)

try {
  cli.parse(process.argv, { run: false })
  await cli.runMatchedCommand()
} catch (err) {
  console.error(pc.red(formatError(err)))
  process.exit(1)
}
