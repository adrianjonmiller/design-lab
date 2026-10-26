<script setup>
import { computed, ref } from 'vue'
import { catalog, config, errorFor, frameUrl } from '../store.js'
import { useViewport } from '../viewport.js'
import PreviewFrame from '../components/PreviewFrame.vue'
import ViewportBar from '../components/ViewportBar.vue'
import EmptyState from '../components/EmptyState.vue'

const props = defineProps({ id: { type: String, required: true } })
const experiment = computed(() => catalog.experiments.find((x) => x.id === props.id))
const viewport = useViewport('experiment')
const src = computed(() => frameUrl({ experiment: props.id }))
const frame = ref()
</script>

<template>
  <div v-if="experiment" class="page page-canvas page-fill">
    <header class="toolbar">
      <div class="toolbar-title">
        <h1>{{ experiment.name }}</h1>
        <code class="muted">{{ config.labDirName }}/{{ experiment.file }}</code>
      </div>
      <div class="toolbar-actions">
        <ViewportBar v-model="viewport" />
        <button type="button" class="button" title="Reload the page" @click="frame?.reload()">Reload</button>
        <a :href="src" target="_blank" class="button">Open in new tab ↗</a>
      </div>
    </header>

    <p v-if="errorFor('experiment', experiment.id)" class="hint hint-error">{{ errorFor('experiment', experiment.id) }}</p>

    <div class="canvas canvas-fill">
      <div class="canvas-frame canvas-frame-fill" :class="{ full: viewport === 'full' }">
        <PreviewFrame ref="frame" :key="experiment.id" :src="src" :title="experiment.name" :width="viewport" />
      </div>
    </div>
  </div>

  <EmptyState v-else title="Experiment not found">
    <p>Nothing at <code>{{ config.labDirName }}/experiments/{{ id }}</code>. It may have been moved or deleted.</p>
    <RouterLink to="/experiments">Back to all experiments</RouterLink>
  </EmptyState>
</template>
