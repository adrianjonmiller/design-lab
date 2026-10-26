// design-lab configuration. Changes restart the lab automatically.
export default {
  // The app's source folder, relative to the app. Lab files import it as `@app/...` (read-only);
  // `@/...` and the app's other aliases work too.
  appSrc: __APP_SRC__,

  // The app's stylesheets, relative to the app, loaded into every preview so lab UI looks like
  // the real product.
  globalStyles: __GLOBAL_STYLES__,

  // Optional: other codebases lab files can import from (read-only), as `@<name>/...`.
  // Each keeps its own aliases: a project's `@/` still means its own src, not the app's.
  // A path starts with `.` or `/` and is relative to the app; anything else is an installed package.
  // projects: {
  //   ui: '../design-system',
  //   kit: '@acme/ui',
  // },

  // Optional: aliases for lab files only, relative to this folder.
  // aliases: { '@mocks': './_mocks' },

  // Optional: a file in this folder whose default export receives each preview's Vue app,
  // for installing plugins the app's components need (Pinia, i18n, a router stub, ...).
  //   // .design-lab/setup.js
  //   import { createPinia } from 'pinia'
  //   export default (app) => app.use(createPinia())
  // setup: './setup.js',

  // Optional: a component in this folder that wraps every preview in its default slot,
  // for app-level providers the app puts around its root (tooltips, toasts, theme, ...).
  //   <!-- .design-lab/Wrapper.vue -->
  //   <template><TooltipProvider><slot /></TooltipProvider></template>
  // wrapper: './Wrapper.vue',

  // Widths offered by the viewport switcher.
  viewports: { mobile: 375, tablet: 768, desktop: 1280 },

  // Extra Vite config merged into the lab server, for plugins previews need (auto-imports, ...).
  // Only the app's aliases are read from its vite.config; its plugins are not used.
  // vite: {},
}
