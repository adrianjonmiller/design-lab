# design-lab

This folder is a design play area. It is served by `npx design-lab`, which hot-reloads every change, so you never need to run, build or install anything.

## Ground rules
- **Only create or edit files inside this folder.** Never change anything outside `.design-lab/`: not the app's source, `package.json`, configs or lockfiles.
- **Never install dependencies.** Use what the parent app already has.
- **Import from the app, don't copy it.** `@app/...` points at the app's source (for example `import Button from '@app/components/Button.vue'`). Reuse the app's components, composables, tokens and styles wherever they fit.
- The app's global styles (see `globalStyles` in `lab.config.js`) are already loaded in every preview, so its utility classes and CSS variables just work.

## Components: `components/`
A component is any `.vue` file under `components/`. Subfolders become groups (`components/forms/TextField.vue`).

Declare its states in a `.lab.js` file with the same name next to it:

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

Cover the states that matter to a designer: default, each variant, disabled, loading, empty, error, and long or awkward content. Without a `.lab.js` file the component renders once with no props.

## Experiments: `experiments/`
Full-page mockups. Use `experiments/Name.vue`, or `experiments/Name/index.vue` when a page needs its own parts (`experiments/Name/Sidebar.vue`, `experiments/Name/data.js`). Only `index.vue` is listed as the page.

Keep experiments self-contained: put mock data inline or in a local `data.js`, and never call real APIs.

## Conventions
- Files and folders starting with `_` are private helpers and are not listed (for example `components/_shared/tokens.js`).
- Prefer `<script setup>`. Use `<style scoped>` for lab-only styling.
- When an experiment is ready to become real, say so to a developer rather than moving it into the app yourself.
