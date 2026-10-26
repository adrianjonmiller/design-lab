import path from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import { LAB_DIRNAME, locateLab, packageRoot, standaloneTemplatesDir, templatesDir, toPosix } from './paths.js'
import { defaultSrc } from './projects.js'
import { UsageError } from './errors.js'

const ENTRY_CANDIDATES = ['src/main.ts', 'src/main.js', 'src/index.ts', 'src/index.js']
const STYLE_IMPORT = /import\s+['"]([^'"]+\.(?:css|scss|sass|less|styl|pcss|postcss))['"]/g

/**
 * Creates <appDir>/.design-lab from the templates if it does not exist yet.
 * Never writes anywhere else in the app.
 */
export async function scaffold(appDir) {
  const labDir = path.join(appDir, LAB_DIRNAME)
  if (existsSync(labDir)) return { created: false, labDir }
  if (!existsSync(appDir)) throw new UsageError(`Directory not found: ${appDir}`)

  await copyTemplates(labDir, [templatesDir])

  const detected = await detectApp(appDir)
  await fillConfig(labDir, {
    __APP_SRC__: quote(detected.appSrc),
    __GLOBAL_STYLES__: formatList(detected.globalStyles.map(quote)),
  })

  return { created: true, labDir }
}

/**
 * Makes `labDir` a lab of its own: lab files at its root, plus a package.json to install
 * design-lab into and run it with `npm run design-lab`. Files already in the folder are kept.
 * @param {Record<string, string>} projects name → absolute path or package name
 */
export async function scaffoldStandalone(labDir, projects = {}) {
  if (locateLab(labDir).exists) return { created: false, labDir }

  const entries = Object.entries(projects).map(([name, target]) => ({
    name,
    target,
    root: path.isAbsolute(target) ? target : null,
  }))
  for (const { name, root } of entries) {
    if (root && !existsSync(root)) throw new UsageError(`Project "${name}": ${root} not found`)
  }

  // The standalone templates win over the shared ones.
  await copyTemplates(labDir, [standaloneTemplatesDir, templatesDir])

  const globalStyles = []
  for (const { name, root } of entries.filter((e) => e.root)) {
    const src = defaultSrc(root, false)
    // As `@<name>/…` when it is in the project's src, which is how a lab file would import it.
    for (const file of (await detectApp(root)).globalStyles.map((f) => path.join(root, f))) {
      const inSrc = !path.relative(src, file).startsWith('..')
      globalStyles.push(inSrc ? `@${name}/${toPosix(path.relative(src, file))}` : relativeTo(labDir, file))
    }
  }

  await fillConfig(labDir, {
    __PROJECTS__: formatObject(entries.map(({ name, target, root }) => [name, quote(root ? relativeTo(labDir, root) : target)])),
    __GLOBAL_STYLES__: formatList(globalStyles.map(quote)),
  })
  await writePackageJson(labDir, {
    projectRoots: entries.map((e) => e.root).filter(Boolean),
    packages: entries.filter((e) => !e.root).map((e) => e.target),
  })

  return { created: true, labDir }
}

/** Copies template files into `dir`, keeping any that are already there. Earlier folders win. */
async function copyTemplates(dir, sources) {
  for (const source of sources) {
    for (const rel of await fs.readdir(source, { recursive: true })) {
      const from = path.join(source, rel)
      if (!(await fs.stat(from)).isFile()) continue
      // npm strips .gitignore from published packages, so the templates ship without the dot.
      const to = path.join(dir, rel.replace(/(^|[\\/])gitignore$/, '$1.gitignore'))
      if (existsSync(to)) continue
      await fs.mkdir(path.dirname(to), { recursive: true })
      await fs.copyFile(from, to)
    }
  }
  const agents = path.join(dir, 'AGENTS.md')
  if (!existsSync(agents)) await fs.copyFile(path.join(dir, 'CLAUDE.md'), agents)
}

/** Replaces each `__PLACEHOLDER__` in lab.config.js with its value, inserted as written. */
async function fillConfig(labDir, values) {
  const configPath = path.join(labDir, 'lab.config.js')
  const config = await fs.readFile(configPath, 'utf8')
  await fs.writeFile(configPath, config.replace(/__[A-Z_]+__/g, (placeholder) => values[placeholder] ?? placeholder))
}

/**
 * The standalone lab's own package.json: design-lab, its peers and any package projects, at the
 * versions the lab's projects already use. Merged into an existing one; nothing is installed.
 */
async function writePackageJson(labDir, { projectRoots, packages }) {
  const file = path.join(labDir, 'package.json')
  const pkg = existsSync(file)
    ? JSON.parse(await fs.readFile(file, 'utf8'))
    : { name: path.basename(labDir).toLowerCase().replace(/[^a-z0-9._-]+/g, '-'), private: true, type: 'module' }

  const own = readPackage(packageRoot)
  const theirs = projectRoots.map(readPackage).map((p) => ({ ...p.dependencies, ...p.devDependencies }))
  const range = (name) => theirs.find((deps) => deps[name])?.[name]
  const wanted = { 'design-lab': `^${own.version}`, vue: range('vue') ?? own.dependencies.vue }
  if (range('@tailwindcss/vite')) {
    wanted.tailwindcss = range('tailwindcss') ?? range('@tailwindcss/vite')
    wanted['@tailwindcss/vite'] = range('@tailwindcss/vite')
  }
  for (const name of packages) wanted[name] = range(name) ?? 'latest'

  const installed = { ...pkg.dependencies, ...pkg.devDependencies }
  pkg.scripts = { 'design-lab': 'design-lab', ...pkg.scripts }
  pkg.devDependencies = { ...pkg.devDependencies }
  for (const [name, version] of Object.entries(wanted)) if (!installed[name]) pkg.devDependencies[name] = version
  await fs.writeFile(file, JSON.stringify(pkg, null, 2) + '\n')
}

function readPackage(dir) {
  try {
    return JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
  } catch {
    return {}
  }
}

/** Best-effort guesses so the first run already looks like the real app. */
async function detectApp(appDir) {
  const appSrc = existsSync(path.join(appDir, 'src')) ? 'src' : '.'
  const globalStyles = []

  // Stylesheets imported by the app's entry are its global styles.
  for (const candidate of ENTRY_CANDIDATES) {
    const entry = path.join(appDir, candidate)
    if (!existsSync(entry)) continue
    const source = await fs.readFile(entry, 'utf8')
    for (const [, spec] of source.matchAll(STYLE_IMPORT)) {
      if (!spec.startsWith('.')) continue
      const abs = path.resolve(path.dirname(entry), spec)
      if (existsSync(abs)) globalStyles.push(toPosix(path.relative(appDir, abs)))
    }
    break
  }

  return { appSrc, globalStyles }
}

/** A JavaScript string literal in the config's quote style. */
const quote = (value) => `'${String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

/** `file` as lab.config.js would write it from `dir`: relative, unless they only share the root. */
function relativeTo(dir, file) {
  const rel = toPosix(path.relative(dir, file))
  const climbsToRoot = rel.split('/').filter((part) => part === '..').length >= toPosix(dir).split('/').length - 1
  if (path.isAbsolute(rel) || climbsToRoot) return toPosix(file)
  return rel.startsWith('.') ? rel : `./${rel}`
}

function formatList(items) {
  if (!items.length) return '[]'
  return `[\n${items.map((item) => `    ${item},`).join('\n')}\n  ]`
}

function formatObject(entries) {
  if (!entries.length) return '{}'
  const key = (name) => (/^[a-z_$][\w$]*$/i.test(name) ? name : quote(name))
  return `{\n${entries.map(([name, value]) => `    ${key(name)}: ${value},`).join('\n')}\n  }`
}
