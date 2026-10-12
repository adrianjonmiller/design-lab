// design-lab configuration. Changes restart the lab automatically.
export default {
  // Folder of the parent app that lab files can import from as `@app/...` (read-only).
  appSrc: '__APP_SRC__',

  // Parent stylesheets loaded into every preview, so lab UI looks like the real product.
  globalStyles: __GLOBAL_STYLES__,

  // Optional: a file in .design-lab whose default export receives each preview's Vue app,
  // for installing plugins the parent components need (Pinia, i18n, a router stub, ...).
  //   // .design-lab/setup.js
  //   import { createPinia } from 'pinia'
  //   export default (app) => app.use(createPinia())
  // setup: './setup.js',

  // Widths offered by the viewport switcher.
  viewports: { mobile: 375, tablet: 768, desktop: 1280 },

  // Extra Vite config merged into the lab server (aliases, plugins, ...).
  // The parent app's vite.config is never loaded, so add anything previews need here.
  // vite: {},
}
