import path from 'node:path'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { LAB_DIRNAME, templatesDir, toPosix } from './paths.js'

const ENTRY_CANDIDATES = ['src/main.ts', 'src/main.js', 'src/index.ts', 'src/index.js']
const STYLE_IMPORT = /import\s+['"]([^'"]+\.(?:css|scss|sass|less|styl|pcss|postcss))['"]/g

/**
 * Creates <projectDir>/.design-lab from the templates if it does not exist yet.
 * Never writes anywhere else in the project.
 */
export async function scaffold(projectDir) {
  const labDir = path.join(projectDir, LAB_DIRNAME)
  if (existsSync(labDir)) return { created: false, labDir }
  if (!existsSync(projectDir)) throw new Error(`Directory not found: ${projectDir}`)

  await fs.cp(templatesDir, labDir, { recursive: true })
  // npm strips .gitignore from published packages, so the template ships without the dot.
  await fs.rename(path.join(labDir, 'gitignore'), path.join(labDir, '.gitignore'))
  await fs.copyFile(path.join(labDir, 'CLAUDE.md'), path.join(labDir, 'AGENTS.md'))

  const configPath = path.join(labDir, 'lab.config.js')
  const detected = await detectProject(projectDir)
  const config = (await fs.readFile(configPath, 'utf8'))
    .replace("'__APP_SRC__'", JSON.stringify(detected.appSrc).replaceAll('"', "'"))
    .replace('__GLOBAL_STYLES__', formatList(detected.globalStyles))
  await fs.writeFile(configPath, config)

  return { created: true, labDir }
}

/** Best-effort guesses so the first run already looks like the real app. */
async function detectProject(projectDir) {
  const appSrc = existsSync(path.join(projectDir, 'src')) ? 'src' : '.'
  const globalStyles = []

  // Stylesheets imported by the app's entry are its global styles.
  for (const candidate of ENTRY_CANDIDATES) {
    const entry = path.join(projectDir, candidate)
    if (!existsSync(entry)) continue
    const source = await fs.readFile(entry, 'utf8')
    for (const [, spec] of source.matchAll(STYLE_IMPORT)) {
      if (!spec.startsWith('.')) continue
      const abs = path.resolve(path.dirname(entry), spec)
      if (existsSync(abs)) globalStyles.push(toPosix(path.relative(projectDir, abs)))
    }
    break
  }

  return { appSrc, globalStyles }
}

function formatList(items) {
  if (!items.length) return '[]'
  return `[\n${items.map((item) => `    '${item}',`).join('\n')}\n  ]`
}
