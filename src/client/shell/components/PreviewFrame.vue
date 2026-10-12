<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  title: { type: String, default: 'Preview' },
  width: { type: [Number, String], default: 'full' },
  autoHeight: Boolean,
  lazy: Boolean,
})

const frame = ref()
const height = ref(80)

function onMessage(event) {
  if (!props.autoHeight || event.source !== frame.value?.contentWindow) return
  if (event.data?.source === 'design-lab' && event.data.type === 'height') height.value = Math.max(event.data.height, 40)
}
onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => window.removeEventListener('message', onMessage))

const style = computed(() => ({
  width: props.width === 'full' ? '100%' : `${props.width}px`,
  height: props.autoHeight ? `${height.value}px` : '100%',
}))

defineExpose({ reload: () => frame.value?.contentWindow?.location.reload() })
</script>

<template>
  <iframe ref="frame" class="preview-frame" :src="src" :title="title" :style="style" :loading="lazy ? 'lazy' : 'eager'" />
</template>
