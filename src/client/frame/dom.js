// Frame chrome uses inline styles only, so the parent app's global CSS can't restyle it.
const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace'
const SANS = 'system-ui,-apple-system,Segoe UI,sans-serif'

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
  node.append(...children)
  return node
}

export function stateLabel(name, href) {
  const link = el('a', {
    href,
    target: '_blank',
    title: 'Open this state on its own',
    style: `color:#9ca3af;text-decoration:none;margin-left:6px;font:500 11px/1 ${SANS}`,
  }, ['↗'])
  return el('div', {
    style: `display:flex;align-items:center;margin:0 0 8px;font:600 11px/1 ${SANS};letter-spacing:.06em;text-transform:uppercase;color:#6b7280`,
  }, [name, link])
}

export function propsBlock(state) {
  const data = {}
  if (state.props && Object.keys(state.props).length) data.props = state.props
  if (state.slots && Object.keys(state.slots).length) data.slots = describeSlots(state.slots)
  const text = Object.keys(data).length ? JSON.stringify(data, null, 2) : 'No props'
  return el('pre', {
    style: `margin:8px 0 0;padding:10px 12px;border-radius:6px;background:#f3f4f6;color:#374151;font:12px/1.5 ${MONO};white-space:pre-wrap;overflow:auto`,
  }, [text])
}

function describeSlots(slots = {}) {
  return Object.fromEntries(
    Object.entries(slots).map(([name, value]) => [name, typeof value === 'string' ? value : '<render function>']),
  )
}

export function errorBox(err) {
  const message = String(err?.message ?? err)
  const stack = err?.stack && err.stack.replace(`${err.name}: ${message}`, '').trim()
  const box = el('div', {
    style: `margin:8px 0;padding:12px 14px;border-radius:6px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font:13px/1.5 ${SANS}`,
  }, [el('strong', { style: 'display:block;font-weight:600' }, [message])])
  if (stack) {
    box.append(el('details', { style: 'margin-top:6px' }, [
      el('summary', { style: 'cursor:pointer;font-size:12px;color:#b91c1c' }, ['Stack trace']),
      el('pre', { style: `margin:6px 0 0;font:11px/1.5 ${MONO};white-space:pre-wrap;overflow:auto` }, [stack]),
    ]))
  }
  return box
}
