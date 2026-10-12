<script setup>
defineProps({ title: String })
</script>

<template>
  <div class="empty">
    <h2>{{ title }}</h2>
    <slot />
  </div>
</template>
