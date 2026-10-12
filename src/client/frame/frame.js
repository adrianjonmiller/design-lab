// Preview runtime. Runs inside an iframe so the parent app's global CSS and the lab shell never collide.
//   ?component=<id>                 every state, stacked and labelled
//   ?component=<id>&detail=1        same, plus each state's props
//   ?component=<id>&state=<name>    one state, bare
//   ?experiment=<id>                a full page, bare
import 'virtual:design-lab/styles'
import * as initialManifest from 'virtual:design-lab/manifest'
import setup from 'virtual:design-lab/setup'
import config from 'virtual:design-lab/config'
import { mount } from '../adapters/vue.js'
import { el, errorBox, stateLabel, propsBlock } from './dom.js'

const params = new URLSearchParams(location.search)
const target = params.get('experiment')
  ? { kind: 'experiment', id: params.get('experiment') }
  : { kind: 'component', id: params.get('component') }
const root = document.getElementById('design-lab-frame')

let manifest = initialManifest
let mounted = []
let hadError = false

function post(type, data = {}) {
  if (window.parent !== window) window.parent.postMessage({ source: 'design-lab', type, ...target, ...data }, '*')
}

function reportError(err, container = root) {
  hadError = true
  console.error(err)
  container.append(errorBox(err))
  post('error', { message: String(err?.message ?? err) })
}

async function render() {
  mounted.forEach((m) => m.unmount())
  mounted = []
  hadError = false
  root.replaceChildren()

  try {
    if (target.kind === 'experiment') await renderExperiment()
    else await renderComponent()
  } catch (err) {
    reportError(err)
  }
  if (!hadError) post('ok')
}

async function renderExperiment() {
  const entry = manifest.experiments.find((e) => e.id === target.id)
  if (!entry) throw new Error(`No experiment "${target.id}"`)
  const mod = await entry.load()
  mounted.push(await mount(root, mod.default, {}, { setup, onError: (err) => reportError(err) }))
}

async function renderComponent() {
  const entry = manifest.components.find((c) => c.id === target.id)
  if (!entry) throw new Error(`No component "${target.id}"`)
  const [mod, statesMod] = await Promise.all([entry.load(), entry.states?.()])
  const def = statesMod?.default ?? {}
  const states = def.states && Object.keys(def.states).length ? def.states : { Default: {} }

  const only = params.get('state')
  if (only) {
    if (!states[only]) throw new Error(`"${entry.name}" has no state "${only}"`)
    mounted.push(await mount(root, mod.default, states[only], { setup, onError: (err) => reportError(err) }))
    return
  }

  const list = el('div', { style: 'display:flex;flex-direction:column;gap:20px;padding:20px' })
  root.append(list)
  for (const [name, state] of Object.entries(states)) {
    const stage = el('div', { style: `padding:16px;border-radius:8px;${state.background ? `background:${state.background};` : ''}` })
    const mountPoint = el('div')
    stage.append(mountPoint)
    const section = el('section', {}, [stateLabel(name, standaloneUrl(entry.id, name)), stage])
    if (params.get('detail')) section.append(propsBlock(state))
    list.append(section)
    try {
      mounted.push(await mount(mountPoint, mod.default, state, { setup, onError: (err) => reportError(err, stage) }))
    } catch (err) {
      reportError(err, stage)
    }
  }
}

function standaloneUrl(id, state) {
  return `/frame.html?component=${encodeURIComponent(id)}&state=${encodeURIComponent(state)}`
}

// Auto-height for component frames (experiments fill their frame instead).
if (target.kind === 'component') {
  new ResizeObserver(() => post('height', { height: Math.ceil(root.getBoundingClientRect().height) })).observe(root)
}

window.addEventListener('error', (e) => reportError(e.error ?? e.message))
window.addEventListener('unhandledrejection', (e) => reportError(e.reason))

if (import.meta.hot) {
  // A lab file was added, removed, or a .lab.js changed: re-render with the new manifest.
  import.meta.hot.accept('virtual:design-lab/manifest', (next) => {
    if (!next) return
    manifest = next
    render()
  })

  // Compile errors in this frame's own files (Vite shows its overlay here; the shell gets a red dot).
  import.meta.hot.on('vite:error', ({ err }) => {
    const entry = (target.kind === 'experiment' ? manifest.experiments : manifest.components).find((e) => e.id === target.id)
    const files = [entry?.file, entry?.statesFile].filter(Boolean).map((f) => `/${config.labDir}/${f}`)
    if (!files.some((f) => err?.id?.endsWith(f))) return
    hadError = true
    post('error', { message: err.message })
  })

  // Vue hot-swaps fixed components without us re-rendering; re-render once so errors clear.
  import.meta.hot.on('vite:afterUpdate', () => {
    if (hadError) render()
  })
}

render()
