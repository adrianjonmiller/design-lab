import { reactive } from 'vue'
import * as initialManifest from 'virtual:design-lab/manifest'
import config from 'virtual:design-lab/config'

export { config }

// The shell only needs names and paths; it never loads lab code itself (frames do).
export const lab = reactive({
  components: [],
  experiments: [],
  errors: {}, // "component:<id>" | "experiment:<id>" → message
})

function applyManifest({ components, experiments }) {
  lab.components = components.map(({ load, states, ...meta }) => ({ ...meta, hasStates: Boolean(meta.statesFile) }))
  lab.experiments = experiments.map(({ load, ...meta }) => meta)
}
applyManifest(initialManifest)

export const errorFor = (kind, id) => lab.errors[`${kind}:${id}`]

export function frameUrl(params) {
  return `/frame.html?${new URLSearchParams(params)}`
}

window.addEventListener('message', ({ data }) => {
  if (data?.source !== 'design-lab') return
  const key = `${data.kind}:${data.id}`
  if (data.type === 'error') lab.errors[key] = data.message
  else if (data.type === 'ok') delete lab.errors[key]
})

if (import.meta.hot) {
  import.meta.hot.accept('virtual:design-lab/manifest', (next) => next && applyManifest(next))
}

export function readPref(key, fallback) {
  try {
    return localStorage.getItem(`design-lab:${key}`) ?? fallback
  } catch {
    return fallback
  }
}

export function writePref(key, value) {
  try {
    localStorage.setItem(`design-lab:${key}`, value)
  } catch {}
}
