import { radius } from '~tokens'

export const toneClass = (tone) => [radius, tone === 'accent' ? 'bg-ui-accent text-white' : 'bg-white text-gray-900'].join(' ')
