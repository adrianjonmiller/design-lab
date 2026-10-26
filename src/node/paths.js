import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const LAB_DIRNAME = '.design-lab'
export const CONFIG_FILENAME = 'lab.config.js'
export const DEFAULT_PORT = 5199

export const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
export const clientRoot = path.join(packageRoot, 'src/client')
export const templatesDir = path.join(packageRoot, 'templates/lab')
export const standaloneTemplatesDir = path.join(packageRoot, 'templates/standalone')

export const toPosix = (p) => p.split(path.sep).join('/')

/** A path as the person at the terminal would type it: relative when inside the current folder. */
export function displayPath(p) {
  const rel = path.relative(process.cwd(), p)
  if (!rel) return '.'
  return rel.startsWith('..') || path.isAbsolute(rel) ? p : rel
}

/**
 * Where a folder's lab lives. `homeDir` is the folder design-lab runs in: the app, for a
 * `.design-lab/` inside it (`app` mode), or the lab itself, for a folder with `lab.config.js`
 * at its root and no `.design-lab/` (`standalone` mode).
 */
export function locateLab(dir) {
  const homeDir = path.resolve(dir)
  const labDir = path.join(homeDir, LAB_DIRNAME)
  if (existsSync(labDir)) return { mode: 'app', homeDir, labDir, exists: true }
  if (existsSync(path.join(homeDir, CONFIG_FILENAME))) {
    return { mode: 'standalone', homeDir, labDir: homeDir, exists: true }
  }
  return { mode: 'app', homeDir, labDir, exists: false }
}
