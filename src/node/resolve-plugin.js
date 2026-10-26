import path from 'node:path'
import { createHash } from 'node:crypto'
import { applyAliases, createScopes } from './projects.js'

/**
 * Aliases that depend on who is importing: `@/` in a lab file means the app's src, but in a
 * component from another project it means that project's src. Vite's own `resolve.alias` is
 * global (and runs before every plugin), so these aliases live here instead.
 *
 * Bare imports of `dedupe` packages from lab or project files resolve from the lab's home, so a
 * sibling repo with its own node_modules shares the lab's router or store instead of its own copy.
 */
export function scopedResolve(lab) {
  const scopeOf = createScopes(lab)
  const dedupe = new Set(lab.dedupe)
  const homeImporter = path.join(lab.homeDir, 'package.json')

  return {
    name: 'design-lab:scoped-resolve',
    enforce: 'pre',

    async resolveId(id, importer, options) {
      if (!importer || id.startsWith('\0') || importer.startsWith('\0')) return null
      const table = scopeOf(importer)
      if (!table) return null
      const aliased = applyAliases(table, id)
      // Unresolved: let Vite try the original id (tsconfig paths, for one).
      if (aliased) return (await this.resolve(aliased, importer, { ...options, skipSelf: true })) ?? null
      if (dedupe.has(packageName(id))) return (await this.resolve(id, homeImporter, { ...options, skipSelf: true })) ?? null
      return null
    },

    configResolved(config) {
      // CSS @import, @reference and Sass/Less resolve through config.createResolver rather than
      // resolveId, so they need the same aliases. Vite routes client resolvers through it on purpose
      // (for frameworks that override it), and Tailwind's resolvers follow. `url()` is not covered:
      // Vite creates that resolver before this hook runs.
      const createResolver = config.createResolver
      config.createResolver = function (options) {
        const resolve = createResolver.call(this, options)
        return (id, importer, ...rest) => {
          const table = importer && !importer.startsWith('\0') ? scopeOf(importer) : null
          return resolve((table && applyAliases(table, id)) ?? id, importer, ...rest)
        }
      }
    },
  }
}

/**
 * Vite reuses prebundled deps until its config hash changes, and of the plugins that hash only sees
 * names. A no-op plugin named after the settings that decide where imports resolve makes a change
 * to them re-bundle, instead of keeping, say, the copy of a package that `dedupe` no longer picks.
 */
export function resolutionKey(lab) {
  const settings = {
    projects: lab.projects.map((p) => [p.name, p.root, p.src, p.aliases]),
    aliases: lab.aliases,
    dedupe: lab.dedupe,
  }
  const json = JSON.stringify(settings, (_, value) => (value instanceof RegExp ? String(value) : value))
  return { name: `design-lab:resolution-${createHash('sha256').update(json).digest('hex').slice(0, 8)}` }
}

function packageName(id) {
  if (/^[./]|^[a-z]+:|\0/i.test(id)) return null
  const parts = id.split('/')
  return id.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}
