<script setup>
import { computed } from 'vue'
import { config } from '../store.js'

const model = defineModel({ type: [Number, String], required: true })
const options = computed(() => [
  ...Object.entries(config.viewports).map(([name, width]) => ({ name, width })),
  { name: 'full', width: 'full' },
])
</script>

<template>
  <div class="segmented" role="group" aria-label="Viewport width">
    <button
      v-for="o in options"
      :key="o.name"
      type="button"
      :class="{ active: model === o.width }"
      :title="o.width === 'full' ? 'Fill the available width' : `${o.width}px`"
      @click="model = o.width"
    >
      {{ o.name }}<span v-if="o.width !== 'full'" class="segmented-sub">{{ o.width }}</span>
    </button>
  </div>
</template>
