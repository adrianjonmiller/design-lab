# design-lab

A safe play area for designing UI inside a real codebase.

```sh
npx design-lab            # in your project
npx design-lab ../my-app  # or point it at one
```

The first run creates a `.design-lab/` folder in the project and opens a lab with two pages:

- **Components** shows every component in `.design-lab/components`, in every state it declares.
- **Experiments** shows full-page mockups from `.design-lab/experiments`, at mobile, tablet, desktop or full width.

Lab files can import the app's real components and styles, but design-lab never writes outside `.design-lab/`, never touches the app's config or dependencies, and keeps Vite's cache in `.design-lab/.cache`. Developers can commit the folder or gitignore it.

## Designing with an AI agent

Prompting happens in your AI tool of choice (Claude Code, Cursor, …); the lab is the live canvas. `.design-lab/CLAUDE.md` and `.design-lab/AGENTS.md` teach agents the rules: stay inside `.design-lab/`, import from `@app/…` instead of copying, and cover the states that matter.

> In .design-lab, make a PricingCard using our Button, with free, pro and team states, plus loading and long-content states.

## Components and states

Any `.vue` file under `.design-lab/components/` is a component. Subfolders become groups. Its states live in a `.lab.js` file next to it:

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

Without a `.lab.js` file a component renders once with no props. Every state has a ↗ link that opens it on its own.

## Experiments

`.design-lab/experiments/Checkout.vue` is a page. For bigger pages use a folder: `experiments/Checkout/index.vue` is listed, and anything else in the folder (`Sidebar.vue`, `data.js`) is yours to organise.

Files and folders that start with `_` are private helpers and are never listed.

## Configuration

`.design-lab/lab.config.js` is created for you. The lab restarts when it changes.

```js
export default {
  appSrc: 'src',                          // exposed to lab files as `@app/...` (and `@/...`)
  globalStyles: ['src/assets/main.css'],  // loaded into every preview; detected from your entry file
  setup: './setup.js',                    // optional: (app) => app.use(createPinia())
  viewports: { mobile: 375, tablet: 768, desktop: 1280 },
  vite: {},                               // extra Vite config merged into the lab server
}
```

### What carries over from the app

design-lab runs its own Vite server and deliberately ignores the app's `vite.config`. It picks up the app's:

- `vue` (so lab and app components share one runtime) and its `.env` files and `public/` folder
- PostCSS config, and `@tailwindcss/vite` if installed. Tailwind scans the project as it would in the app, plus `.design-lab/` even when it is gitignored.
- the `@/` alias, pointed at `appSrc`

Tailwind v3 reads its `content` globs from `tailwind.config.js`, so classes used only in `.design-lab/` need `'./.design-lab/**/*.{vue,js}'` added there.

Anything else your components need (other aliases, plugins like auto-imports) goes in the `vite` field.

## CLI

```
design-lab [dir]        Start the lab (default: current directory)
  --port <port>     Port to listen on (default: 5199)
  --host [host]     Expose the lab on the network
  --open            Open it in the browser
design-lab init [dir]   Create .design-lab/ without starting the server
```

## Developing design-lab

```sh
npm install
cd playground && npm install && cd ..
node bin/design-lab.js playground
```

`playground/` is a small Vue + Tailwind app to try the lab against.

### How it works

- `src/node/server.js` builds an inline Vite config rooted at `src/client`, with aliases into the project.
- `src/node/plugin.js` globs `.design-lab/` into a virtual manifest and hot-updates it when files are added or removed.
- `src/client/shell/` is the lab UI. It never loads lab code itself.
- `src/client/frame/` renders previews inside iframes, so the app's global CSS and the shell never collide. It reports errors and its height to the shell with `postMessage`.
- `src/client/adapters/vue.js` is the only framework-specific runtime code. Another framework would add a sibling adapter.
