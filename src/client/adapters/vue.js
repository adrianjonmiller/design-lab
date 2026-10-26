// The framework seam: frame.js only talks to `mount`. Another framework adds a sibling adapter.
import { createApp, h } from 'vue'

/**
 * Mounts `Component` into `el` as its own app so states never share state or errors.
 * @param {{ props?: object, slots?: object }} state  slot values are strings, vnodes or functions
 * @param {{ setup?: (app) => any, wrapper?: object, onError?: (err: unknown) => void }} options
 *   `wrapper` is a component whose default slot receives the preview, for app-level providers.
 */
export async function mount(el, Component, state = {}, { setup, wrapper, onError } = {}) {
  const props = state.props ?? {}
  const slots = Object.fromEntries(
    Object.entries(state.slots ?? {}).map(([name, value]) => [name, typeof value === 'function' ? value : () => value]),
  )

  const preview = () => h(Component, props, slots)
  const app = createApp({
    name: 'DesignLabState',
    render: () => (wrapper ? h(wrapper, null, { default: preview }) : preview()),
  })
  app.config.errorHandler = (err) => onError?.(err)
  // Warnings (a missing required prop, an unknown component) keep Vue's default: the frame's console.
  if (setup) await setup(app)
  app.mount(el)
  return { unmount: () => app.unmount() }
}
