<script setup>
import { cn } from '@/utils/cn.js'
defineProps({ variant: { type: String, default: 'primary' }, disabled: Boolean })
</script>

<template>
  <button
    :disabled="disabled"
    :class="cn(
      'inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50',
      variant === 'primary' ? 'bg-brand text-white hover:opacity-90' : 'border border-gray-300 bg-white text-gray-800',
    )"
  >
    <slot />
  </button>
</template>
