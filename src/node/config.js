import path from 'node:path'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { loadConfigFromFile } from 'vite'
import { CONFIG_FILENAME } from './paths.js'
import { applyAliases, normalizeAliases, resolveProjects } from './projects.js'

const DEFAULTS = {
  appSrc: 'src',
  projects: {},
  aliases: {},
  // Packages that hold app-wide state: projects with their own node_modules must share the lab's copy.
  dedupe: ['vue-router', 'pinia', 'vue-i18n'],
  globalStyles: [],
  setup: null,
  wrapper: null,
  viewports: { mobile: 375, tablet: 768, desktop: 1280 },
  vite: {},
}

/** @param {{ mode: 'app' | 'standalone', homeDir: string, labDir: string }} location from locateLab */
export async function loadLabConfig({ mode, homeDir, labDir }) {
  const configPath = path.join(labDir, CONFIG_FILENAME)
  let user = {}
  if (existsSync(configPath)) {
    // The runner loader evaluates the file in memory (nothing is written into the app) and handles
    // ESM syntax whether or not the folder is "type": "module".
    // A config that exports a function receives this env, so it can build paths from the lab's home
    // rather than from its own location (which is elsewhere when .design-lab is a symlink).
    const loaded = await loadConfigFromFile(
      { command: 'serve', mode: 'development', homeDir, labDir, labMode: mode },
      configPath,
      labDir,
      'silent',
      undefined,
      'runner',
    )
    user = loaded?.config ?? {}
  }

  const config = { ...DEFAULTS, ...user, viewports: { ...DEFAULTS.viewports, ...user.viewports } }
  const projects = await resolveProjects(config, { mode, homeDir })
  // `@<name>/…` in globalStyles points into that project, as it would from a lab file.
  const projectAliases = projects.map((p) => ({ find: `@${p.name}`, replacement: p.src }))

  return {
    ...config,
    mode,
    configPath,
    homeDir,
    labDir,
    // Where the lab's files really are: differs from labDir when .design-lab is a symlink.
    labRealDir: realpathSync(labDir),
    homeName: readPackageName(homeDir),
    projects,
    aliases: normalizeAliases(config.aliases, labDir, CONFIG_FILENAME),
    dedupe: [].concat(config.dedupe ?? []),
    globalStyles: [].concat(config.globalStyles ?? []).map((file) =>
      path.resolve(homeDir, applyAliases(projectAliases, file) ?? file),
    ),
    setup: config.setup ? path.resolve(labDir, config.setup) : null,
    wrapper: config.wrapper ? path.resolve(labDir, config.wrapper) : null,
  }
}

function readPackageName(dir) {
  try {
    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
    if (pkg.name) return pkg.name
  } catch {}
  return path.basename(dir)
}
