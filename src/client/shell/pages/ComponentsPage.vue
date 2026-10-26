<script setup>
import { catalog, config, errorFor, frameUrl } from '../store.js'
import PreviewFrame from '../components/PreviewFrame.vue'
import EmptyState from '../components/EmptyState.vue'
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Components</h1>
        <p class="muted">Every component in <code>{{ config.labDirName }}/components</code>, in every state.</p>
      </div>
    </header>

    <EmptyState v-if="!catalog.components.length" title="No components yet">
      <p>Add a <code>.vue</code> file to <code>{{ config.labDirName }}/components/</code> and it shows up here.</p>
      <p>Declare its states in a <code>.lab.js</code> file next to it:</p>
      <pre><code>// {{ config.labDirName }}/components/Button.lab.js
export default {
  states: {
    Primary:  { props: { variant: 'primary' }, slots: { default: 'Save' } },
    Disabled: { props: { disabled: true }, slots: { default: 'Save' } },
  },
}</code></pre>
    </EmptyState>

    <div v-else class="card-grid">
      <article
        v-for="c in catalog.components"
        :key="c.id"
        class="card"
        :class="{ 'has-error': errorFor('component', c.id) }"
      >
        <RouterLink :to="`/components/${c.id}`" class="card-head">
          <span class="card-title"><span v-if="c.group" class="muted">{{ c.group }}/</span>{{ c.name }}</span>
          <span class="card-open">Open →</span>
        </RouterLink>
        <PreviewFrame :src="frameUrl({ component: c.id })" :title="c.name" auto-height lazy />
      </article>
    </div>
  </div>
</template>
