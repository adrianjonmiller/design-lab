<script setup>
import { computed } from 'vue'
import { lab, config, errorFor, frameUrl } from '../store.js'
import { useViewport } from '../viewport.js'
import PreviewFrame from '../components/PreviewFrame.vue'
import ViewportBar from '../components/ViewportBar.vue'
import EmptyState from '../components/EmptyState.vue'

const props = defineProps({ id: { type: String, required: true } })
const component = computed(() => lab.components.find((c) => c.id === props.id))
const viewport = useViewport('component')
</script>

<template>
  <div v-if="component" class="page page-canvas">
    <header class="toolbar">
      <div class="toolbar-title">
        <h1>{{ component.name }}</h1>
        <code class="muted">{{ config.labDir }}/{{ component.file }}</code>
      </div>
      <ViewportBar v-model="viewport" />
    </header>

    <p v-if="!component.hasStates" class="hint">
      Showing the default state. Add <code>{{ component.name }}.lab.js</code> next to the component to declare more.
    </p>
    <p v-if="errorFor('component', component.id)" class="hint hint-error">{{ errorFor('component', component.id) }}</p>

    <div class="canvas">
      <div class="canvas-frame" :class="{ full: viewport === 'full' }">
        <PreviewFrame
          :key="component.id"
          :src="frameUrl({ component: component.id, detail: 1 })"
          :title="component.name"
          :width="viewport"
          auto-height
        />
      </div>
    </div>
  </div>

  <EmptyState v-else title="Component not found">
    <p>Nothing at <code>{{ config.labDir }}/components/{{ id }}.vue</code>. It may have been moved or deleted.</p>
    <RouterLink to="/components">Back to all components</RouterLink>
  </EmptyState>
</template>
