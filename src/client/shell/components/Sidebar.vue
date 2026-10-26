<script setup>
import { computed, ref } from 'vue'
import { catalog, config, errorFor } from '../store.js'

const query = ref('')
const match = (item) => item.id.toLowerCase().includes(query.value.trim().toLowerCase())
const components = computed(() => catalog.components.filter(match))
const experiments = computed(() => catalog.experiments.filter(match))
</script>

<template>
  <aside class="sidebar">
    <header class="brand">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22"><rect width="32" height="32" rx="8" fill="currentColor" /><path d="M12 8h8M14 8v7l-5 9h14l-5-9V8" stroke="white" stroke-width="2" fill="none" stroke-linejoin="round" /></svg>
      </span>
      <div>
        <div class="brand-name">design-lab</div>
        <div class="brand-home">{{ config.homeName }}</div>
      </div>
    </header>

    <input v-model="query" class="filter" type="search" placeholder="Filter…" aria-label="Filter components and experiments" />

    <nav class="nav">
      <RouterLink to="/components" class="nav-heading">
        Components <span class="count">{{ catalog.components.length }}</span>
      </RouterLink>
      <RouterLink
        v-for="c in components"
        :key="c.id"
        :to="`/components/${c.id}`"
        class="nav-item"
        :class="{ 'has-error': errorFor('component', c.id) }"
      >
        <span v-if="c.group" class="nav-group">{{ c.group }}/</span>{{ c.name }}
      </RouterLink>
      <p v-if="!components.length" class="nav-empty">{{ query ? 'No matches' : 'None yet' }}</p>

      <RouterLink to="/experiments" class="nav-heading">
        Experiments <span class="count">{{ catalog.experiments.length }}</span>
      </RouterLink>
      <RouterLink
        v-for="x in experiments"
        :key="x.id"
        :to="`/experiments/${x.id}`"
        class="nav-item"
        :class="{ 'has-error': errorFor('experiment', x.id) }"
      >
        {{ x.name }}
      </RouterLink>
      <p v-if="!experiments.length" class="nav-empty">{{ query ? 'No matches' : 'None yet' }}</p>
    </nav>

    <footer class="sidebar-foot">Files live in <code>{{ config.labDirName }}/</code></footer>
  </aside>
</template>
