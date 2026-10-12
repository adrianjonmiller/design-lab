<script setup>
defineProps({
  title: { type: String, default: 'Card title' },
  body: { type: String, default: '' },
  tone: { type: String, default: 'neutral' }, // neutral | accent | warning
  loading: Boolean,
})
</script>

<template>
  <article class="card" :class="`tone-${tone}`">
    <template v-if="loading">
      <div class="skeleton skeleton-title" />
      <div class="skeleton" />
      <div class="skeleton skeleton-short" />
    </template>
    <template v-else>
      <h3 class="title">{{ title }}</h3>
      <p v-if="body" class="body">{{ body }}</p>
      <footer v-if="$slots.default" class="footer"><slot /></footer>
    </template>
  </article>
</template>

<style scoped>
.card {
  max-width: 340px;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-family: system-ui, sans-serif;
  color: #111827;
}
.tone-accent { border-color: #c7d2fe; background: #eef2ff; }
.tone-warning { border-color: #fde68a; background: #fffbeb; }
.title { margin: 0 0 6px; font-size: 16px; font-weight: 650; }
.body { margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563; }
.footer { margin-top: 14px; font-size: 13px; color: #6b7280; }
.skeleton { height: 12px; margin-top: 10px; border-radius: 6px; background: #f3f4f6; }
.skeleton-title { width: 50%; height: 16px; margin-top: 0; }
.skeleton-short { width: 70%; }
</style>
