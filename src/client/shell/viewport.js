import { ref, watch } from 'vue'
import { readPref, writePref } from './store.js'

/** A viewport choice remembered per page type. */
export function useViewport(key, fallback = 'full') {
  const stored = readPref(`viewport:${key}`, fallback)
  const viewport = ref(stored === 'full' ? 'full' : Number(stored) || fallback)
  watch(viewport, (value) => writePref(`viewport:${key}`, value))
  return viewport
}
