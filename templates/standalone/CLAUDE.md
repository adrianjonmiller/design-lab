# design-lab

This folder is a standalone design lab: a play area for UI built from other codebases. It is served by `npm run design-lab`, which hot-reloads every change, so you never need to run or build anything.

## Ground rules
- **Only create or edit files inside this folder.** Never change the projects it imports from: not their source, `package.json`, configs or lockfiles.
- **Never install dependencies.** Use what this folder and its projects already have.
- **Import from the projects, don't copy them.** Every entry in `projects` in `lab.config.js` is a codebase imported as `@<name>/...`, pointing at its source (for example `import Button from '@app/components/Button.vue'`). Reuse their components, composables, tokens and styles wherever they fit.
- Their components keep resolving their own aliases (a project's `@/` is its own source), so import them as they are.
- The stylesheets in `globalStyles` are already loaded in every preview, so the projects' utility classes and CSS variables just work.

## Imports
- `@<name>/...` is a project's source. A project named `app` is the main one: its aliases, `@/` included, work in lab files too.
- `@lab/...` is this folder, for imports that would otherwise need long `../../` chains. `aliases` in `lab.config.js` adds lab-only shortcuts.

## Components: `components/`
A component is any `.vue` file under `components/`. Subfolders become groups (`components/forms/TextField.vue`).

Declare its states in a states file: a `.lab.js` (or `.lab.ts`) file with the same name next to it:

```js
// components/PricingCard.lab.js
export default {
  states: {
    Default:  { props: { plan: 'Pro', price: 29 } },
    Featured: { props: { plan: 'Pro', price: 29, featured: true } },
    Loading:  { props: { loading: true } },
    'Long content': { props: { plan: 'Enterprise with a very long name', price: 1299 } },
    // Slots take a string, or a function returning vnodes: () => h('strong', 'Hi')
    WithFooter: { props: { plan: 'Team' }, slots: { footer: 'Billed yearly' } },
    // Optional backdrop for that state's stage
    'On dark':  { props: { plan: 'Pro' }, background: '#111827' },
  },
}
```

Cover the states that matter to a designer: default, each variant, disabled, loading, empty, error, and long or awkward content. Without a states file the component renders once with no props.

## Experiments: `experiments/`
Full-page mockups. Use `experiments/Name.vue`, or `experiments/Name/index.vue` when a page needs its own parts (`experiments/Name/Sidebar.vue`, `experiments/Name/data.js`). Only `index.vue` is listed as the page.

Keep experiments self-contained: put mock data inline or in a local `data.js`, and never call real APIs.

## Conventions
- Files and folders starting with `_` are private helpers and are not listed (for example `components/_shared/tokens.js`).
- Prefer `<script setup>`. Use `<style scoped>` for lab-only styling.
- When an experiment is ready to become real, say so to a developer rather than moving it into the app yourself.
