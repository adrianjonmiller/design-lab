import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const LAB_DIRNAME = '.design-lab'
export const CONFIG_FILENAME = 'lab.config.js'

export const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
export const clientRoot = path.join(packageRoot, 'src/client')
export const templatesDir = path.join(packageRoot, 'templates/lab')

export const toPosix = (p) => p.split(path.sep).join('/')
