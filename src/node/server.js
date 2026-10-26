import path from 'node:path'
import { existsSync, realpathSync, watch } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { createServer, mergeConfig, searchForWorkspaceRoot } from 'vite'
import vue from '@vitejs/plugin-vue'
import pc from 'picocolors'
import { DEFAULT_PORT, clientRoot, displayPath, packageRoot, toPosix } from './paths.js'
import { loadLabConfig } from './config.js'
import { formatError } from './errors.js'
import { labPlugin } from './plugin.js'
import { locatePackage } from './projects.js'
import { resolutionKey, scopedResolve } from './resolve-plugin.js'

/**
 * Starts the lab and restarts it whenever lab.config.js, or a project's vite.config (which its
 * aliases come from), changes.
 * @param {{ mode: 'app' | 'standalone', homeDir: string, labDir: string }} location from locateLab
 */
export async function startLab(location, options = {}) {
  let { lab, viteConfig } = await prepare(location, options)
  let server = await listen(viteConfig)
  server.printUrls()
  console.log(`  ${pc.dim('➜  Lab files:')} ${pc.cyan(displayPath(location.labDir))}\n`)

  let restarting = null
  let unwatch = watchConfigs(lab, restart)
  function restart(file) {
    if (restarting) return
    restarting = (async () => {
      console.log(pc.dim(`${displayPath(file)} changed, restarting…`))
      // Load the new config before closing anything, so a half-saved file leaves the lab running.
      const next = await prepare(location, { ...options, port: server.config.server.port, open: false })
      await server.close()
      server = await listen(next.viteConfig)
      lab = next.lab
      console.log(`${pc.green('✔')} Restarted on port ${server.config.server.port}`)
    })()
      .catch((err) => {
        console.error(pc.red(formatError(err)))
        console.error(pc.dim('The lab keeps running with the previous config.'))
      })
      .finally(() => {
        restarting = null
        unwatch()
        unwatch = watchConfigs(lab, restart)
      })
  }
}

async function prepare(location, options) {
  const lab = await loadLabConfig(location)
  return { lab, viteConfig: await createViteConfig(lab, options) }
}

async function listen(viteConfig) {
  const server = await createServer(viteConfig)
  await server.listen()
  return server
}

/** Watches each config's folder rather than the file, since editors often replace files on save. */
function watchConfigs(lab, onChange) {
  const byDir = new Map()
  for (const file of [lab.configPath, ...lab.projects.map((p) => p.configFile)].filter(Boolean)) {
    const dir = realpathSync(path.dirname(file))
    if (!byDir.has(dir)) byDir.set(dir, new Set())
    byDir.get(dir).add(path.basename(file))
  }
  const watchers = [...byDir].map(([dir, names]) =>
    watch(dir, (_event, name) => name && names.has(name) && onChange(path.join(dir, name))),
  )
  return () => watchers.forEach((w) => w.close())
}

async function createViteConfig(lab, options) {
  const { mode, homeDir, labDir, labRealDir, projects } = lab
  // The app supplies what an app's own dev server would: .env files, public/ and PostCSS config.
  // That is the folder around an in-app lab, or a standalone lab's `app` project when it has one.
  const appDir = projects.find((p) => p.isApp)?.root ?? homeDir
  // The lab's home first, then each project: lab, shell and project components must share one Vue,
  // and the SFC compiler must come from that same copy.
  const lookupDirs = [homeDir, ...projects.map((p) => p.root)]
  const vueDir = lookupDirs.map((dir) => locatePackage('vue', dir)).find(Boolean) ?? locatePackage('vue', packageRoot)
  const publicDir = path.join(appDir, 'public')

  const config = {
    configFile: false, // never run the app's vite.config (projects.js only reads its aliases)
    root: clientRoot,
    // A standalone lab's root is scanned by Tailwind, which always skips node_modules.
    cacheDir: mode === 'standalone' ? path.join(labDir, 'node_modules/.design-lab') : path.join(labDir, '.cache'),
    envDir: appDir,
    publicDir: existsSync(publicDir) ? publicDir : false,
    clearScreen: false,
    appType: 'spa',
    plugins: [
      resolutionKey(lab),
      scopedResolve(lab),
      ...(labRealDir !== labDir ? [linkedLab(labDir, labRealDir)] : []),
      vue({ compiler: tryRequire(createRequire(path.join(vueDir, 'package.json')), 'vue/compiler-sfc') }),
      ...(await detectStylingPlugins(lookupDirs, lab)),
      labPlugin(lab),
    ],
    resolve: {
      // Only aliases that mean the same to every importer. `@/`, `@app/` and `@<project>/` depend
      // on who imports them, so scopedResolve handles those.
      alias: [
        { find: /^@lab\//, replacement: toPosix(labDir) + '/' },
        { find: /^vue$/, replacement: toPosix(vueDir) },
      ],
      // Each file resolves through its own nearest tsconfig.json, so a project's `paths` stay its own.
      tsconfigPaths: true,
    },
    css: { postcss: appDir },
    server: {
      port: Number(options.port) || DEFAULT_PORT,
      host: options.host,
      open: options.open ? '/' : false,
      // The workspace root, not just the project: in a monorepo the app's styles and components
      // reach into sibling packages (fonts, shared components), as Vite's own default allows.
      fs: {
        allow: [
          searchForWorkspaceRoot(homeDir),
          labRealDir,
          packageRoot,
          ...nodeModulesDirs(),
          ...projects.flatMap((p) => [p.root, p.realRoot]),
        ],
      },
      // Vite ignores its cacheDir already, but by the link path; a linked lab's watcher sees the real one.
      watch: { ignored: [toPosix(path.join(labRealDir, '.cache')) + '/**'] },
    },
    optimizeDeps: {
      entries: [path.join(clientRoot, 'index.html'), path.join(clientRoot, 'frame.html')],
    },
  }

  return lab.vite ? mergeConfig(config, lab.vite) : config
}

/**
 * Plugins the app almost certainly relies on for styling, which live in its vite.config (whose
 * plugins we deliberately do not use). Anything else goes in lab.config.js `vite`.
 */
async function detectStylingPlugins(lookupDirs, lab) {
  const plugins = []
  const tailwind = lookupDirs.map((dir) => tryResolve(createRequire(path.join(dir, 'package.json')), '@tailwindcss/vite')).find(Boolean)
  if (tailwind) {
    const mod = await import(pathToFileURL(tailwind).href)
    // Tailwind already scans the app around an in-app lab; every other project is outside its root.
    const scannedAlready = (p) => p.isApp && lab.mode === 'app'
    const sources = [lab.labRealDir, ...lab.projects.filter((p) => !scannedAlready(p)).map((p) => p.realSrc)]
    plugins.push(tailwindLabSource(sources, lab.globalStyles))
    // Tailwind scans for class names from Vite's root, which for us is design-lab's own client.
    plugins.push(...[].concat(mod.default()).map((p) => withRoot(p, lab.homeDir)))
  }
  return plugins
}

/**
 * Tailwind skips gitignored paths, and teams often gitignore .design-lab. It also only scans
 * from the lab's home, so other projects' classes are never seen. An explicit `@source` is always
 * scanned, so add one per folder to the app's Tailwind entry CSS (in memory only).
 *
 * The entry is every global stylesheet the lab loads as well as any file importing tailwindcss
 * directly: when the app imports its Tailwind entry from another package (a monorepo's shared
 * tokens), Tailwind inlines that import itself and Vite never transforms the inner file.
 *
 * Sources are absolute: a linked lab is elsewhere on disk, and a path relative to the stylesheet
 * would depend on whether Tailwind starts from its link or its real location.
 */
function tailwindLabSource(sources, globalStyles = []) {
  const roots = new Set(globalStyles.map(toPosix))
  const directives = [...new Set(sources.map(toPosix))].map((dir) => `@source ${JSON.stringify(dir)};`).join('\n')
  return {
    name: 'design-lab:tailwind-source',
    enforce: 'pre',
    transform(code, id) {
      const file = toPosix(id.split('?')[0])
      if (!file.endsWith('.css')) return
      if (!roots.has(file) && !/@import\s+['"]tailwindcss/.test(code)) return
      return { code: `${code}\n${directives}\n`, map: null }
    },
  }
}

/**
 * A lab linked in from elsewhere (`.design-lab` is a symlink to its own checkout). Vite resolves
 * files to their real location, where neither the app's relative paths nor the app's
 * node_modules are reachable, and every tool that resolves from a file's id (Vue's type imports,
 * Tailwind's CSS @imports) inherits that. Give lab files their link path as their id instead, so
 * they sit inside the app for everyone. Files outside the lab keep their real paths, which
 * pnpm's layout needs.
 */
function linkedLab(labDir, labRealDir) {
  const realPrefix = toPosix(labRealDir) + '/'
  const linkPrefix = toPosix(labDir) + '/'
  return {
    name: 'design-lab:linked-lab',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (!resolved || !toPosix(resolved.id).startsWith(realPrefix)) return resolved
      return { ...resolved, id: linkPrefix + toPosix(resolved.id).slice(realPrefix.length) }
    },
  }
}

/** Lets a plugin see `root` as the lab's home, as it would see the app's folder inside the app. */
function withRoot(plugin, root) {
  const { configResolved } = plugin
  if (!configResolved) return plugin
  const hook = typeof configResolved === 'function' ? configResolved : configResolved.handler
  return {
    ...plugin,
    configResolved(config) {
      const proxied = new Proxy(config, { get: (target, key) => (key === 'root' ? root : Reflect.get(target, key)) })
      return hook.call(this, proxied)
    },
  }
}

function tryResolve(req, id) {
  try {
    return req.resolve(id)
  } catch {
    return null
  }
}

function tryRequire(req, id) {
  try {
    return req(id)
  } catch {
    return undefined
  }
}

/** Where design-lab's own dependencies live (differs under npx, where they are hoisted). */
function nodeModulesDirs() {
  const req = createRequire(import.meta.url)
  return ['vue', 'vue-router'].map((name) => path.dirname(path.dirname(req.resolve(`${name}/package.json`))))
}
