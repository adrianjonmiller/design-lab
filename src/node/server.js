import path from 'node:path'
import { existsSync, watch } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { createServer, mergeConfig, searchForWorkspaceRoot } from 'vite'
import vue from '@vitejs/plugin-vue'
import pc from 'picocolors'
import { LAB_DIRNAME, clientRoot, packageRoot, toPosix } from './paths.js'
import { loadLabConfig } from './config.js'
import { labPlugin } from './plugin.js'

/** Starts the lab and restarts it whenever lab.config.js changes. */
export async function startLab(projectDir, options = {}) {
  const labDir = path.join(projectDir, LAB_DIRNAME)
  let server = await boot(projectDir, labDir, options)
  server.printUrls()
  console.log(`  ${pc.dim('➜  Lab files:')} ${pc.cyan(path.relative(process.cwd(), labDir) || labDir)}\n`)

  let restarting = null
  watch(labDir, (_event, file) => {
    if (file !== 'lab.config.js' || restarting) return
    restarting = (async () => {
      console.log(pc.dim('lab.config.js changed, restarting…'))
      const port = server.config.server.port
      await server.close()
      server = await boot(projectDir, labDir, { ...options, port, open: false })
      console.log(`${pc.green('✔')} Restarted on port ${server.config.server.port}`)
    })()
      .catch((err) => console.error(pc.red(err?.stack ?? String(err))))
      .finally(() => (restarting = null))
  })
}

async function boot(projectDir, labDir, options) {
  const lab = await loadLabConfig(projectDir, labDir)
  const server = await createServer(await createViteConfig(lab, options))
  await server.listen()
  return server
}

async function createViteConfig(lab, options) {
  const { projectDir, labDir, appSrcDir } = lab
  const projectRequire = createRequire(path.join(projectDir, 'package.json'))
  const projectVue = resolvePackageDir(projectRequire, 'vue')
  const publicDir = path.join(projectDir, 'public')

  const config = {
    configFile: false, // never pick up the parent app's vite.config
    root: clientRoot,
    cacheDir: path.join(labDir, '.cache'),
    envDir: projectDir,
    publicDir: existsSync(publicDir) ? publicDir : false,
    clearScreen: false,
    appType: 'spa',
    plugins: [
      vue({ compiler: tryRequire(projectRequire, 'vue/compiler-sfc') }),
      ...(await detectProjectPlugins(projectRequire, projectDir, labDir, lab.globalStyles)),
      labPlugin(lab),
    ],
    resolve: {
      alias: [
        { find: /^@lab\//, replacement: toPosix(labDir) + '/' },
        { find: /^@app\//, replacement: toPosix(appSrcDir) + '/' },
        // Most Vue apps alias `@/` to src, so parent components importing `@/…` keep working.
        { find: /^@\//, replacement: toPosix(appSrcDir) + '/' },
        // Lab, shell and parent components must share one Vue runtime: prefer the project's copy.
        ...(projectVue ? [{ find: /^vue$/, replacement: projectVue }] : []),
      ],
    },
    css: { postcss: projectDir },
    server: {
      port: Number(options.port) || 5199,
      host: options.host,
      open: options.open ? '/' : false,
      // The workspace root, not just the project: in a monorepo the app's styles and components
      // reach into sibling packages (fonts, shared components), as Vite's own default allows.
      fs: { allow: [searchForWorkspaceRoot(projectDir), packageRoot, ...nodeModulesDirs()] },
      watch: { ignored: ['**/.design-lab/.cache/**'] },
    },
    optimizeDeps: {
      entries: [path.join(clientRoot, 'index.html'), path.join(clientRoot, 'frame.html')],
    },
  }

  return lab.vite ? mergeConfig(config, lab.vite) : config
}

/**
 * Plugins the parent app almost certainly relies on for styling, which live in its
 * vite.config (that we deliberately do not load). Anything else goes in lab.config.js `vite`.
 */
async function detectProjectPlugins(projectRequire, projectDir, labDir, globalStyles) {
  const plugins = []
  const tailwind = tryResolve(projectRequire, '@tailwindcss/vite')
  if (tailwind) {
    const mod = await import(pathToFileURL(tailwind).href)
    plugins.push(tailwindLabSource(labDir, globalStyles))
    // Tailwind scans for class names from Vite's root, which for us is design-lab's own client.
    plugins.push(...[].concat(mod.default()).map((p) => withRoot(p, projectDir)))
  }
  return plugins
}

/**
 * Tailwind skips gitignored paths, and teams often gitignore .design-lab. An explicit `@source`
 * is always scanned, so add one to the app's Tailwind entry CSS (in memory only).
 *
 * The entry is every global stylesheet the lab loads as well as any file importing tailwindcss
 * directly: when the app imports its Tailwind entry from another package (a monorepo's shared
 * tokens), Tailwind inlines that import itself and Vite never transforms the inner file.
 */
function tailwindLabSource(labDir, globalStyles = []) {
  const roots = new Set(globalStyles.map(toPosix))
  return {
    name: 'design-lab:tailwind-source',
    enforce: 'pre',
    transform(code, id) {
      const file = toPosix(id.split('?')[0])
      if (!file.endsWith('.css')) return
      if (!roots.has(file) && !/@import\s+['"]tailwindcss/.test(code)) return
      const rel = toPosix(path.relative(path.dirname(file), labDir))
      return { code: `${code}\n@source ${JSON.stringify(rel)};\n`, map: null }
    },
  }
}

/** Lets a plugin see `root` as the project dir, as it would inside the parent app. */
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

function resolvePackageDir(req, name) {
  const pkgJson = tryResolve(req, `${name}/package.json`)
  return pkgJson ? toPosix(path.dirname(pkgJson)) : null
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
