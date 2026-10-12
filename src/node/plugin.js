import path from 'node:path'
import { existsSync } from 'node:fs'
import { glob } from 'tinyglobby'
import { toPosix } from './paths.js'

const MANIFEST = 'virtual:design-lab/manifest'
const CONFIG = 'virtual:design-lab/config'
const SETUP = 'virtual:design-lab/setup'
const STYLES = 'virtual:design-lab/styles'
const VIRTUAL = new Set([MANIFEST, CONFIG, SETUP, STYLES])

// Files and folders starting with `_` are private helpers and are never listed.
const PRIVATE = ['**/_*', '**/_*/**']
const STATE_EXTS = ['.lab.js', '.lab.ts', '.lab.mjs']

export function labPlugin(lab) {
  const { labDir } = lab
  let server

  return {
    name: 'design-lab',

    resolveId(id) {
      if (VIRTUAL.has(id)) return '\0' + id
    },

    async load(id) {
      if (!id.startsWith('\0virtual:design-lab/')) return
      const name = id.slice(1)
      if (name === MANIFEST) return generateManifest(labDir)
      if (name === CONFIG) {
        return `export default ${JSON.stringify({
          projectName: lab.projectName,
          viewports: lab.viewports,
          labDir: path.basename(labDir),
        })}`
      }
      if (name === SETUP) {
        return lab.setup ? `export { default } from ${JSON.stringify(toPosix(lab.setup))}` : 'export default null'
      }
      if (name === STYLES) {
        return lab.globalStyles.map((file) => `import ${JSON.stringify(toPosix(file))}`).join('\n')
      }
    },

    configureServer(_server) {
      server = _server
      server.watcher.add(labDir)
      const onAddOrRemove = (file) => {
        if (!isLabEntry(labDir, file)) return
        const mod = server.moduleGraph.getModuleById('\0' + MANIFEST)
        if (mod) server.reloadModule(mod)
      }
      server.watcher.on('add', onAddOrRemove)
      server.watcher.on('unlink', onAddOrRemove)
    },
  }
}

function isLabEntry(labDir, file) {
  const rel = toPosix(path.relative(labDir, file))
  return (rel.startsWith('components/') || rel.startsWith('experiments/')) && /\.(vue|lab\.[mc]?[jt]s)$/.test(rel)
}

async function generateManifest(labDir) {
  const [componentFiles, experimentFiles] = await Promise.all([
    glob(['components/**/*.vue'], { cwd: labDir, ignore: PRIVATE }),
    glob(['experiments/*.vue', 'experiments/*/index.vue'], { cwd: labDir, ignore: PRIVATE }),
  ])

  const components = componentFiles.sort().map((file) => {
    const id = file.replace(/^components\//, '').replace(/\.vue$/, '')
    const base = file.replace(/\.vue$/, '')
    const statesFile = STATE_EXTS.map((ext) => base + ext).find((f) => existsSync(path.join(labDir, f)))
    return {
      id,
      name: path.posix.basename(id),
      group: path.posix.dirname(id) === '.' ? '' : path.posix.dirname(id),
      file,
      statesFile: statesFile ?? null,
      load: `() => import(${JSON.stringify('@lab/' + file)})`,
      states: statesFile ? `() => import(${JSON.stringify('@lab/' + statesFile)})` : 'null',
    }
  })

  const experiments = experimentFiles.sort().map((file) => {
    const id = file.replace(/^experiments\//, '').replace(/(\/index)?\.vue$/, '')
    return {
      id,
      name: id,
      file,
      load: `() => import(${JSON.stringify('@lab/' + file)})`,
    }
  })

  return [
    `export const components = [${components.map(serializeEntry).join(',')}\n]`,
    `export const experiments = [${experiments.map(serializeEntry).join(',')}\n]`,
  ].join('\n')
}

/** JSON for data fields, raw code for the lazy import functions. */
function serializeEntry(entry) {
  const fields = Object.entries(entry).map(([key, value]) =>
    key === 'load' || key === 'states' ? `${key}: ${value}` : `${key}: ${JSON.stringify(value)}`,
  )
  return `\n  { ${fields.join(', ')} }`
}
