<template lang="pug">
teleport(to='body')
  transition(name='fade')
    .link-preview-tooltip(
      v-if='visible && pageData'
      :style='positionStyle'
      )
      .link-preview-title {{ pageData.title }}
      .link-preview-desc(v-if='pageData.description') {{ pageData.description }}
      .link-preview-path /{{ pageData.path }}
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  pageData: { type: Object, default: null }
})

const positionStyle = computed(() => {
  const offsetX = 12
  const offsetY = 16
  // Keep tooltip within viewport
  const maxX = (typeof window !== 'undefined' ? window.innerWidth : 1920) - 340
  const adjustedX = Math.min(props.x + offsetX, maxX)
  return {
    left: `${adjustedX}px`,
    top: `${props.y + offsetY}px`
  }
})
</script>

<style lang="scss">
.link-preview-tooltip {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  border-radius: 8px;
  padding: 10px 14px;
  max-width: 320px;
  box-shadow: 0 8px 24px rgba(0,0,0,.3);
  background-color: $dark-4;
  border: 1px solid rgba(255,255,255,.12);

  @at-root .body--light & {
    background-color: #fff;
    border-color: $grey-3;
    box-shadow: 0 8px 24px rgba(0,0,0,.12);
  }
}

.link-preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;

  @at-root .body--light & {
    color: $grey-9;
  }
}

.link-preview-desc {
  font-size: 12px;
  color: rgba(255,255,255,.6);
  margin-top: 4px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  @at-root .body--light & {
    color: $grey-6;
  }
}

.link-preview-path {
  font-size: 11px;
  color: rgba(255,255,255,.35);
  margin-top: 4px;
  font-family: monospace;

  @at-root .body--light & {
    color: $grey-5;
  }
}

.fade-enter-active {
  transition: opacity .15s ease;
}
.fade-leave-active {
  transition: opacity .1s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
