// The framework seam: frame.js only talks to `mount`. Another framework adds a sibling adapter.
import { createApp, h } from 'vue'

/**
 * Mounts `Component` into `el` as its own app so states never share state or errors.
 * @param {{ props?: object, slots?: object }} state  slot values are strings, vnodes or functions
 * @param {{ setup?: (app) => any, onError?: (err: unknown) => void }} options
 */
export async function mount(el, Component, state = {}, { setup, onError } = {}) {
  const props = state.props ?? {}
  const slots = Object.fromEntries(
    Object.entries(state.slots ?? {}).map(([name, value]) => [name, typeof value === 'function' ? value : () => value]),
  )

  const app = createApp({ name: 'DesignLabState', render: () => h(Component, props, slots) })
  app.config.errorHandler = (err) => onError?.(err)
  app.config.warnHandler = () => {}
  if (setup) await setup(app)
  app.mount(el)
  return { unmount: () => app.unmount() }
}
