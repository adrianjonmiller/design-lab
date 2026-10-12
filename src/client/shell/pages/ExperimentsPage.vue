<script setup>
import { lab, config, errorFor, frameUrl } from '../store.js'
import PreviewFrame from '../components/PreviewFrame.vue'
import EmptyState from '../components/EmptyState.vue'
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Experiments</h1>
        <p class="muted">Full-page mockups from <code>{{ config.labDir }}/experiments</code>.</p>
      </div>
    </header>

    <EmptyState v-if="!lab.experiments.length" title="No experiments yet">
      <p>
        Add <code>{{ config.labDir }}/experiments/Checkout.vue</code>, or a folder with an
        <code>index.vue</code> for bigger pages. Everything else in that folder is yours to organise.
      </p>
    </EmptyState>

    <div v-else class="thumb-grid">
      <RouterLink
        v-for="x in lab.experiments"
        :key="x.id"
        :to="`/experiments/${x.id}`"
        class="card thumb"
        :class="{ 'has-error': errorFor('experiment', x.id) }"
      >
        <div class="thumb-viewport">
          <PreviewFrame :src="frameUrl({ experiment: x.id })" :title="x.name" lazy tabindex="-1" />
        </div>
        <div class="card-head">
          <span class="card-title">{{ x.name }}</span>
          <span class="card-open">Open →</span>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
