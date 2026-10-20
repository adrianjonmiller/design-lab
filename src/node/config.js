import path from 'node:path'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { loadConfigFromFile } from 'vite'
import { CONFIG_FILENAME } from './paths.js'

const DEFAULTS = {
  appSrc: 'src',
  globalStyles: [],
  setup: null,
  wrapper: null,
  viewports: { mobile: 375, tablet: 768, desktop: 1280 },
  vite: {},
}

export async function loadLabConfig(projectDir, labDir) {
  const configPath = path.join(labDir, CONFIG_FILENAME)
  let user = {}
  if (existsSync(configPath)) {
    // Vite's loader bundles the file, so it works whether or not the project is "type": "module".
    // A config that exports a function receives this env, so it can build paths from the project
    // rather than from its own location (which is elsewhere when .design-lab is a symlink).
    const loaded = await loadConfigFromFile(
      { command: 'serve', mode: 'development', projectDir, labDir },
      configPath,
      labDir,
      'silent',
    )
    user = loaded?.config ?? {}
  }

  const config = { ...DEFAULTS, ...user, viewports: { ...DEFAULTS.viewports, ...user.viewports } }
  return {
    ...config,
    configPath,
    projectDir,
    labDir,
    // Where the lab's files really are: differs from labDir when .design-lab is a symlink.
    labRealDir: realpathSync(labDir),
    projectName: readProjectName(projectDir),
    appSrcDir: path.resolve(projectDir, config.appSrc),
    globalStyles: [].concat(config.globalStyles ?? []).map((file) => path.resolve(projectDir, file)),
    setup: config.setup ? path.resolve(labDir, config.setup) : null,
    wrapper: config.wrapper ? path.resolve(labDir, config.wrapper) : null,
  }
}

function readProjectName(projectDir) {
  try {
    const pkg = JSON.parse(readFileSync(path.join(projectDir, 'package.json'), 'utf8'))
    if (pkg.name) return pkg.name
  } catch {}
  return path.basename(projectDir)
}
