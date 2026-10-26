# design-lab

A safe play area for designing UI inside a real codebase.

```sh
npx design-lab            # in your project
npx design-lab ../my-app  # or point it at one
```

Or give the lab a home of its own and run it with `npm run design-lab` (see [A standalone lab](#a-standalone-lab)).

The first run creates a `.design-lab/` folder in the app and starts a lab with two pages (add `--open` to open it in the browser):

- **Components** shows every component in `.design-lab/components`, in every state it declares.
- **Experiments** shows full-page mockups from `.design-lab/experiments`, at mobile, tablet, desktop or full width.

Lab files can import the app's real components and styles, and those of [other projects](#importing-from-other-projects), but design-lab never writes outside `.design-lab/`, never touches the app's config or dependencies, and keeps Vite's cache in `.design-lab/.cache`. Developers can commit the folder or gitignore it.

## Designing with an AI agent

Prompting happens in your AI tool of choice (Claude Code, Cursor, …); the lab is the live canvas. `.design-lab/CLAUDE.md` and `.design-lab/AGENTS.md` teach agents the rules: stay inside `.design-lab/`, import from `@app/…` instead of copying, and cover the states that matter.

> In .design-lab, make a PricingCard using our Button, with free, pro and team states, plus loading and long-content states.

## Components and states

Any `.vue` file under `.design-lab/components/` is a component. Subfolders become groups. Its states live in a states file next to it, with the same name and `.lab.js` (or `.lab.ts`, `.lab.mjs`):

```js
// .design-lab/components/PricingCard.lab.js
import { h } from 'vue'

export default {
  states: {
    Free: { props: { plan: 'Free', price: 0 } },
    Pro: { props: { plan: 'Pro', price: 29, featured: true } },
    WithFooter: { props: { plan: 'Team' }, slots: { footer: () => h('em', 'Billed yearly') } },
    'On dark': { props: { plan: 'Pro' }, background: '#111827' },
  },
}
```

| State field  | Meaning                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| `props`      | Props passed to the component                                            |
| `slots`      | Slot content: a string, or a function returning vnodes                   |
| `background` | CSS background for that state's stage                                    |

Without a states file a component renders once with no props. Every state has a ↗ link that opens it on its own.

## Experiments

`.design-lab/experiments/Checkout.vue` is a page. For bigger pages use a folder: `experiments/Checkout/index.vue` is listed, and anything else in the folder (`Sidebar.vue`, `data.js`) is yours to organise.

Files and folders that start with `_` are private helpers and are never listed.

## Imports

| In a lab file    | Points at                                                               |
| ---------------- | ----------------------------------------------------------------------- |
| `@app/…`, `@/…`  | The app's source (`appSrc`)                                             |
| `@lab/…`         | The lab folder itself, instead of long `../../` chains                  |
| `@<name>/…`      | The source of a project listed in `projects`                            |

Lab files also get the app's own aliases. When two aliases match, the first of these wins:

1. `aliases` in `lab.config.js`, for lab files only
2. `@<name>/` for each project, `@app/` included (so a project named `ui` hides an app alias `@ui`)
3. the app's `vite.config` aliases: only `resolve.alias` is read, and its plugins are not used
4. `@/` pointed at `appSrc`, when the app's `vite.config` doesn't define `@`
5. `paths` from the nearest `tsconfig.json`

`@lab/` and `vue` are the only aliases that apply to every file; the rest only apply to lab files, so the app's own files keep their meaning of `@app/` or `@/`.

## Configuration

`.design-lab/lab.config.js` is created for you. The lab restarts when it changes.

```js
export default {
  appSrc: 'src',                          // relative to the app; `@app/...` and `@/...` in lab files
  globalStyles: ['src/assets/main.css'],  // relative to the app (or `@<name>/...`); loaded into every preview
  projects: { ui: '../design-system' },   // relative to the app; other codebases, imported as `@ui/...`
  aliases: { '@mocks': './_mocks' },      // relative to .design-lab; for lab files only
  dedupe: ['vue-router', 'pinia', 'vue-i18n'], // shared with projects that have their own copy
  setup: './setup.js',                    // relative to .design-lab: (app) => app.use(createPinia())
  wrapper: './Wrapper.vue',               // relative to .design-lab: wraps every preview in its <slot />
  viewports: { mobile: 375, tablet: 768, desktop: 1280 },
  vite: {},                               // extra Vite config merged into the lab server
}
```

### What carries over from the app

design-lab runs its own Vite server. It never uses the app's `vite.config` as its config: it evaluates it in memory (nothing is written) only to read `resolve.alias`. It picks up the app's:

- `vue` (so lab and app components share one runtime) and its `.env` files and `public/` folder
- PostCSS config, and `@tailwindcss/vite` if installed. Tailwind scans the app as it would on its own, plus `.design-lab/` even when it is gitignored.
- aliases, as listed under [Imports](#imports)

Tailwind v3 reads its `content` globs from `tailwind.config.js`, so classes used only in `.design-lab/` need `'./.design-lab/**/*.{vue,js}'` added there.

Anything else your components need (plugins like auto-imports) goes in the `vite` field. Aliases there apply to every file, so prefer `aliases` or a project's own config. To skip tsconfig paths, set `vite: { resolve: { tsconfigPaths: false } }`.

The config can also be a function. It receives `homeDir` (the folder design-lab runs in: the app, or a standalone lab's own folder), `labDir` and `labMode` (`'app'` or `'standalone'`), so paths can come from there rather than from the config file's own location:

```js
import path from 'node:path'

export default ({ homeDir }) => ({
  projects: { ui: path.resolve(homeDir, '../../packages/ui') },
})
```

## Importing from other projects

`projects` lists other codebases lab files can use: sibling repositories, monorepo packages or installed packages. A path starts with `.` or `/` and is relative to the app (to the lab folder, for a standalone lab); anything else is a package name. A project's `src` and `aliases` are relative to its own root.

```js
export default {
  projects: {
    ui: '../design-system',               // src/ when it has one, else the whole folder
    kit: '@acme/ui',                      // an installed package
    shared: { root: '../../packages/shared', src: 'lib', aliases: { '~': './lib' }, viteConfig: false },
  },
}
```

```vue
<script setup>
import Card from '@ui/components/Card.vue'
</script>
```

Each project is `@<name>/…` in lab files and keeps its own aliases: when `Card.vue` imports `@/utils/tone.js`, that is the design system's `src/utils`, not the app's. A project's aliases come, in that order, from its `aliases` field, its `vite.config` (unless `viteConfig: false`), `@/` pointed at its `src`, and its `tsconfig.json`. They also apply inside its `<style>` blocks (`@import`, Tailwind's `@reference`).

design-lab also serves each project's files, and has Tailwind scan them for class names. A project's theme (its `@theme` tokens, for example) only applies once its stylesheet is in `globalStyles`: `globalStyles: ['@ui/styles.css']`.

When a project has its own `node_modules`, `dedupe` packages (Vue Router, Pinia and vue-i18n by default) come from the lab's home instead, so a store installed by `setup.js` is the one the project's components see. Vue itself is always shared.

Names that clash with an installed npm scope (a project called `vue` would hide `@vue/*`) and `lab` are refused.

Limits:
- `url(@/…)` in a project's CSS still resolves against the app; use a relative path.
- Installed packages don't hot-reload, since Vite never watches `node_modules`. With pnpm's global store, add its path to `vite.server.fs.allow`.
- Types in `defineProps<Props>()` are resolved by TypeScript, which only knows `tsconfig.json` paths, as in the project itself.

## A standalone lab

A lab doesn't have to live inside an app. A standalone lab is its own folder, with its own `package.json`, that pulls from any number of projects:

```sh
mkdir acme-lab && cd acme-lab
npx design-lab init --standalone --project app=../acme-dashboard --project ui=../design-system
npm install
npm run design-lab
```

`init --standalone` writes `lab.config.js`, `components/`, `experiments/` and agent instructions at the folder's root, with each project's global styles already in `globalStyles`. It adds a `package.json` (or merges into the one there) with a `design-lab` script and devDependencies on design-lab, Vue, Tailwind (when a project uses it) and every package project, at the versions the projects already use. It never runs `npm install`. A folder with `lab.config.js` at its root is a standalone lab from then on: `design-lab` there runs it rather than creating a `.design-lab/` inside it.

A project named `app` plays the part of the app in an in-app lab: lab files share its aliases, `@/` included, and its `.env` files, `public/` folder and PostCSS config are used. Vite's cache lives in `node_modules/.design-lab`.

## A lab in its own repository

`.design-lab` can be a symlink to a checkout somewhere else, so a team can keep its lab in a separate repository without the app's repository tracking it. Lab files then resolve as if they sat inside the app: relative paths into the app, bare imports from the app's `node_modules`, Vue's type imports and Tailwind's CSS `@import`s all work as they would in place. Gitignore `.design-lab` without a trailing slash; `.design-lab/` matches a folder but not a symlink.

A lab linked in from elsewhere should not compute paths from `import.meta.url` in `lab.config.js`, because that is the checkout's real location. Use the function form above.

## CLI

```
design-lab [dir]        Start the lab for an app or a standalone lab (default: current directory)
  --port <port>     Port to listen on (default: 5199)
  --host [host]     Expose the lab on the network
  --open            Open it in the browser
design-lab init [dir]   Create a lab without starting the server
  --standalone      Make [dir] a lab of its own, with a package.json
  --project <n=p>   A project for the standalone lab: name=path or name=package (repeatable)
```

## Developing design-lab

```sh
npm install
cd playground && npm install && cd ..
node bin/design-lab.js playground
```

`playground/` is a small Vue + Tailwind app to try the lab against. Next to it:

- `playground/design-system/` is a second codebase with its own `@/` alias and Tailwind theme. Add `projects: { ui: './design-system' }` to `playground/.design-lab/lab.config.js` to import it as `@ui/…`.
- `playground/standalone-lab/` is a standalone lab using both, linked to this checkout: `cd playground/standalone-lab && npm install && npm run design-lab`.

### How it works

- `src/node/server.js` builds an inline Vite config rooted at `src/client`. `src/node/paths.js` `locateLab` decides whether a folder holds an in-app or a standalone lab.
- `src/node/projects.js` resolves the app and `projects` into roots and alias tables, reading each `vite.config`'s aliases with Vite's runner loader. `src/node/resolve-plugin.js` applies each table only to its own project's files (and lab files), in JavaScript and in CSS.
- `src/node/plugin.js` globs the lab folder into a virtual manifest and hot-updates it when files are added or removed.
- `src/client/shell/` is the lab UI. It never loads lab code itself.
- `src/client/frame/` renders previews inside iframes, so the app's global CSS and the shell never collide. It reports errors and its height to the shell with `postMessage`.
- `src/client/adapters/vue.js` is the only framework-specific runtime code. Another framework would add a sibling adapter.
