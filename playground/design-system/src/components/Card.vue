<script setup>
import { toneClass } from '@/utils/tone.js'
defineProps({ title: String, tone: { type: String, default: 'neutral' } })
</script>

<template>
  <article class="ui-card" :class="toneClass(tone)">
    <h3 class="font-semibold">{{ title }}</h3>
    <slot />
  </article>
</template>

<style scoped>
@reference "@/styles.css";

.ui-card {
  @apply border border-ui-accent/30 p-5 shadow-sm;
}
</style>
