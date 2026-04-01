<!-- eslint-disable -->
<template lang="pug">
q-card.icon-picker(flat, style='width: 500px; max-height: 520px;')
  q-toolbar.bg-primary.text-white
    q-icon.q-mr-sm(name='mdi-emoticon-outline')
    .text-subtitle2 Icon Picker
    q-space
    q-btn(icon='ph ph-x', flat, dense, round, v-close-popup)
  q-card-section.q-pb-none
    q-input(
      v-model='state.search'
      outlined
      dense
      placeholder='Search icons...'
      clearable
      autofocus
      )
      template(#prepend)
        q-icon(name='mdi-magnify')
  q-card-section.q-pt-sm
    .text-caption.text-grey-7.q-mb-sm {{ filteredIcons.length }} icons{{ state.search ? ' matching "' + state.search + '"' : '' }}
    q-scroll-area(style='height: 300px;')
      .icon-grid
        q-btn.icon-grid-item(
          v-for='icon in displayedIcons'
          :key='icon'
          flat
          dense
          padding='sm'
          :class='state.selIcon === icon ? "bg-primary text-white" : ""'
          @click='selectIcon(icon)'
          )
          q-icon(:name='"mdi-" + icon', size='24px')
          q-tooltip {{ icon }}
      .text-center.q-pa-md.text-grey-6(v-if='filteredIcons.length === 0')
        | No icons found
      .text-center.q-pa-sm(v-if='filteredIcons.length > displayLimit')
        q-btn(
          flat
          dense
          no-caps
          color='primary'
          :label='`Show more (${filteredIcons.length - displayLimit} remaining)`'
          @click='displayLimit += 200'
          )
  q-separator
  q-card-actions
    .flex.items-center.q-gutter-sm(v-if='state.selIcon')
      q-avatar(size='32px', color='primary', rounded)
        q-icon(:name='"mdi-" + state.selIcon', color='white', size='20px')
      .text-caption.text-grey-7 {{ 'mdi-' + state.selIcon }}
    q-space
    q-btn(
      icon='ph ph-x'
      label='Discard'
      outline
      color='grey-7'
      v-close-popup
    )
    q-btn(
      icon='ph ph-check'
      label='Apply'
      unelevated
      color='secondary'
      :disable='!state.selIcon'
      @click='apply'
    )
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import mdiIconList from '@/helpers/mdiIcons.js'

// PROPS

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  }
})

// EMITS

const emit = defineEmits(['update:modelValue'])

// DATA

const state = reactive({
  search: '',
  selIcon: ''
})

const displayLimit = ref(200)

// COMPUTED

const filteredIcons = computed(() => {
  if (!state.search) return mdiIconList
  const q = state.search.toLowerCase()
  return mdiIconList.filter(icon => icon.includes(q))
})

const displayedIcons = computed(() => {
  return filteredIcons.value.slice(0, displayLimit.value)
})

// METHODS

function selectIcon (icon) {
  state.selIcon = icon
}

function apply () {
  emit('update:modelValue', 'mdi-' + state.selIcon)
}

// MOUNTED

onMounted(() => {
  if (props.modelValue?.startsWith('mdi-')) {
    state.selIcon = props.modelValue.substring(4)
  }
})
</script>

<style lang="scss">
.icon-picker {
  .icon-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }

  .icon-grid-item {
    width: 42px;
    height: 42px;
    min-width: 42px;
    border-radius: 6px;

    &:hover {
      @at-root .body--light & {
        background-color: $grey-3;
      }
      @at-root .body--dark & {
        background-color: $dark-5;
      }
    }
  }
}
</style>
