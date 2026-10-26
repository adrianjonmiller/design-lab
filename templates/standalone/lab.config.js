// design-lab configuration for a standalone lab. Changes restart the lab automatically.
export default {
  // The codebases lab files can import from (read-only). Each one is `@<name>/...` in lab files,
  // pointing at its src folder, and keeps its own aliases: a project's `@/` still means its own src.
  // A path starts with `.` or `/` and is relative to this folder; anything else is an installed
  // package. `aliases` targets are relative to the project:
  //   ui: '../design-system',
  //   kit: '@acme/ui',
  //   shared: { root: '../packages/shared', src: 'lib', aliases: { '~': './lib' } },
  // A project named `app` is the main app: lab files share its aliases, `@/` included, and its
  // .env files, public/ folder and PostCSS config are used.
  projects: __PROJECTS__,

  // Stylesheets loaded into every preview, so lab UI looks like the real product. Relative to
  // this folder, or `@<name>/...` to point into a project.
  globalStyles: __GLOBAL_STYLES__,

  // Optional: aliases for lab files only, relative to this folder.
  // aliases: { '@mocks': './_mocks' },

  // Optional: a file in this folder whose default export receives each preview's Vue app,
  // for installing plugins the projects' components need (Pinia, i18n, a router stub, ...).
  //   // setup.js
  //   import { createPinia } from 'pinia'
  //   export default (app) => app.use(createPinia())
  // setup: './setup.js',

  // Optional: a component in this folder that wraps every preview in its default slot,
  // for app-level providers the app puts around its root (tooltips, toasts, theme, ...).
  //   <!-- Wrapper.vue -->
  //   <template><TooltipProvider><slot /></TooltipProvider></template>
  // wrapper: './Wrapper.vue',

  // Widths offered by the viewport switcher.
  viewports: { mobile: 375, tablet: 768, desktop: 1280 },

  // Extra Vite config merged into the lab server, for plugins previews need (auto-imports, ...).
  // vite: {},
}
