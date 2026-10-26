import path from 'node:path'
import { existsSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { loadConfigFromFile } from 'vite'
import pc from 'picocolors'
import { clientRoot, toPosix } from './paths.js'
import { UsageError } from './errors.js'

const NAME = /^[a-z0-9][a-z0-9._-]*$/i
const VITE_CONFIGS = ['vite.config.js', 'vite.config.mjs', 'vite.config.ts', 'vite.config.mts', 'vite.config.cjs', 'vite.config.cts']

/**
 * The codebases lab files can import from: the app around an in-app lab, plus everything in
 * `projects`. Each one gets its own alias table, which only applies to its own files.
 */
export async function resolveProjects(config, { mode, homeDir }) {
  const projects = []
  if (mode === 'app') {
    projects.push(await createProject('app', { root: '.', src: config.appSrc }, homeDir, { isApp: true, srcField: 'appSrc' }))
  }

  for (const [name, spec] of Object.entries(config.projects ?? {})) {
    if (mode === 'app' && name === 'app') throw new UsageError('`app` is the app around .design-lab; set `appSrc` instead.')
    if (name === 'lab') throw new UsageError('`lab` is reserved for the lab itself (`@lab/`); pick another project name.')
    if (!NAME.test(name)) throw new UsageError(`Project names become \`@<name>/\` aliases, so "${name}" can't be one.`)
    if (existsSync(path.join(homeDir, 'node_modules', `@${name}`))) {
      throw new UsageError(`Project "${name}" would shadow the installed @${name}/* packages; pick another name.`)
    }
    // A standalone lab's `app` project plays the app's part: lab files share its aliases, `@/` included.
    const isApp = mode === 'standalone' && name === 'app'
    const options = { isApp, srcField: `projects.${name}.src` }
    projects.push(await createProject(name, typeof spec === 'string' ? { root: spec } : spec, homeDir, options))
  }
  return projects
}

/** In lab.config.js a path starts with `.` or `/`; anything else names an installed package. */
export const isPathSpec = (spec) => spec.startsWith('.') || path.isAbsolute(spec)

/** A project's source folder when lab.config.js doesn't name one. */
export function defaultSrc(root, isPackage) {
  // A package's own src/ (if it ships one) is rarely what its exports point at, so use all of it.
  const src = path.join(root, 'src')
  return !isPackage && existsSync(src) ? src : root
}

async function createProject(name, spec, homeDir, { isApp, srcField }) {
  if (!spec?.root) throw new UsageError(`Project "${name}" needs a \`root\`.`)
  const isPackage = !isPathSpec(spec.root)
  const root = isPackage ? locatePackage(spec.root, homeDir) : path.resolve(homeDir, spec.root)
  if (!root || !existsSync(root)) {
    throw new UsageError(`Project "${name}": ${isPackage ? `package ${spec.root} is not installed` : `${root} not found`}.`)
  }
  const src = spec.src ? path.resolve(root, spec.src) : defaultSrc(root, isPackage)
  if (!existsSync(src)) throw new UsageError(`\`${srcField}\` '${spec.src}' not found (looked for ${src}).`)

  const vite = isPackage || spec.viteConfig === false ? { aliases: [], file: null } : await loadViteAliases(root)
  const aliases = [
    ...normalizeAliases(spec.aliases, root),
    ...vite.aliases,
    // Most Vue apps alias `@/` to src; a guess that only applies when nothing above claims `@`.
    ...(isPackage ? [] : [{ find: '@', replacement: toPosix(src) }]),
  ]

  return {
    name,
    isApp,
    root,
    realRoot: realpathSync(root),
    src,
    realSrc: realpathSync(src),
    aliases,
    configFile: vite.file,
  }
}

/**
 * The project's own aliases, read from its vite.config without keeping anything else from it.
 * The runner loader evaluates the file in memory, so nothing is written into the project.
 */
async function loadViteAliases(root) {
  const file = VITE_CONFIGS.map((name) => path.join(root, name)).find((f) => existsSync(f))
  if (!file) return { aliases: [], file: null }

  // Configs often read process.cwd() or loadEnv(mode, process.cwd()), as if run from their project.
  const cwd = process.cwd()
  try {
    process.chdir(root)
    const loaded = await loadConfigFromFile({ command: 'serve', mode: 'development' }, file, root, 'silent', undefined, 'runner')
    return { aliases: normalizeAliases(loaded?.config?.resolve?.alias, root, file), file }
  } catch (err) {
    warn(`Could not read aliases from ${file}: ${err?.message ?? err}`)
    return { aliases: [], file }
  } finally {
    process.chdir(cwd)
  }
}

/**
 * Vite's object or array alias forms as `{ find, replacement }` entries. Replacements starting
 * with `.` are relative to `root`; bare ones are left as package names, as Vite would.
 */
export function normalizeAliases(alias, root, source = 'aliases') {
  if (!alias) return []
  const list = Array.isArray(alias) ? alias : Object.entries(alias).map(([find, replacement]) => ({ find, replacement }))
  return list.flatMap(({ find, replacement, customResolver }) => {
    if (typeof replacement !== 'string' || !(typeof find === 'string' || find instanceof RegExp)) {
      warn(`Skipping an alias in ${source}: only string replacements are supported.`)
      return []
    }
    if (customResolver) warn(`Ignoring the customResolver of alias ${find} in ${source}.`)
    // Vite trims the trailing slash when both sides have one.
    if (typeof find === 'string' && find.endsWith('/') && replacement.endsWith('/')) {
      find = find.slice(0, -1)
      replacement = replacement.slice(0, -1)
    }
    return [{ find, replacement: absolutize(replacement, root) }]
  })
}

function absolutize(replacement, root) {
  if (replacement === '.' || replacement.startsWith('./') || replacement.startsWith('../')) {
    return toPosix(path.resolve(root, replacement))
  }
  // `/src` means the project's root to Vite, but it would be design-lab's client to ours.
  if (replacement.startsWith('/')) {
    const head = '/' + replacement.split('/')[1]
    if (!existsSync(head) && existsSync(path.join(root, head))) return toPosix(path.join(root, replacement))
  }
  return replacement
}

/** The first alias that matches `id`, applied as Vite would; null when none does. */
export function applyAliases(entries, id) {
  for (const { find, replacement } of entries) {
    if (typeof find === 'string') {
      if (id === find || id.startsWith(find + '/')) return replacement + id.slice(find.length)
      continue
    }
    find.lastIndex = 0
    if (!find.test(id)) continue
    find.lastIndex = 0
    return id.replace(find, replacement)
  }
  return null
}

/**
 * Maps an importer to the alias table of the codebase it belongs to: the lab or one of its
 * projects, whichever root is the closest. Dependencies inside a project (anything under
 * node_modules) and design-lab's own client belong to none.
 *
 * Lab files look up, in order: the lab's own `aliases`, `@<name>/` for every project (`@app/`
 * included), then the app's aliases.
 */
export function createScopes(lab) {
  const labTable = [
    ...lab.aliases,
    ...lab.projects.map((p) => ({ find: `@${p.name}`, replacement: toPosix(p.src) })),
    ...(lab.projects.find((p) => p.isApp)?.aliases ?? []),
  ]
  const scopes = [
    ...lab.projects.flatMap((p) => [p.root, p.realRoot].map((dir) => ({ dir, table: p.aliases }))),
    ...[lab.labDir, lab.labRealDir].map((dir) => ({ dir, table: labTable })),
  ]
    .map((scope) => ({ ...scope, dir: toPosix(scope.dir).replace(/\/?$/, '/') }))
    .sort((a, b) => b.dir.length - a.dir.length)
  const client = toPosix(clientRoot) + '/'

  return (importer) => {
    const file = toPosix(importer.split('?')[0])
    if (file.startsWith(client)) return null
    const scope = scopes.find((s) => file.startsWith(s.dir))
    if (!scope || file.slice(scope.dir.length).split('/').includes('node_modules')) return null
    return scope.table
  }
}

/** A package's folder as Node would find it from `fromDir`, even when it doesn't export package.json. */
export function locatePackage(name, fromDir) {
  const req = createRequire(path.join(fromDir, 'package.json'))
  return (req.resolve.paths(name) ?? [])
    .map((dir) => path.join(dir, name))
    .find((dir) => existsSync(path.join(dir, 'package.json')))
}

function warn(message) {
  console.warn(`${pc.yellow('!')} ${message}`)
}
