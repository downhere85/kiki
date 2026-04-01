<template lang="pug">
q-dialog(
  :model-value='modelValue'
  @update:model-value='$emit(`update:modelValue`, $event)'
  no-backdrop-dismiss
  transition-show='jump-down'
  transition-hide='jump-up'
  )
  .command-palette
    .command-palette-input
      q-icon.command-palette-icon(name='ph ph-magnifying-glass', size='20px')
      input.command-palette-field(
        ref='inputRef'
        v-model='state.query'
        placeholder='Search pages or type a command...'
        @keydown='onKeyDown'
        autocomplete='off'
        spellcheck='false'
        )
      q-badge.q-mr-sm(label='ESC', color='grey-7', outline, @click='close')
    q-separator(dark)
    .command-palette-list(ref='listRef')
      //- QUICK ACTIONS
      template(v-if='!state.query')
        .command-palette-section-header Quick Actions
        .command-palette-item(
          v-for='(action, idx) of quickActions'
          :key='action.id'
          :class='{ active: state.activeIndex === idx }'
          @mousedown.prevent='runAction(action)'
          )
          q-icon.command-palette-item-icon(:name='action.icon', size='18px')
          .command-palette-item-label {{ action.label }}
          .command-palette-item-hint(v-if='action.hint') {{ action.hint }}
      //- SEARCH RESULTS
      template(v-else)
        template(v-if='state.loading')
          .command-palette-empty
            q-spinner(color='grey', size='20px')
        template(v-else-if='state.results.length === 0')
          .command-palette-empty No results for "{{ state.query }}"
        template(v-else)
          .command-palette-section-header Pages
          .command-palette-item(
            v-for='(item, idx) of state.results'
            :key='item.id'
            :class='{ active: state.activeIndex === idx }'
            @mousedown.prevent='goToPage(item)'
            )
            q-icon.command-palette-item-icon(:name='item.icon || `ph ph-file-text`', size='18px')
            .command-palette-item-label {{ item.title }}
            .command-palette-item-hint /{{ item.path }}
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { debounce } from 'lodash-es'
import gql from 'graphql-tag'

import { useEditorStore } from '@/stores/editor'
import { usePageStore } from '@/stores/page'
import { useSiteStore } from '@/stores/site'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  modelValue: Boolean
})
const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const editorStore = useEditorStore()
const pageStore = usePageStore()
const siteStore = useSiteStore()
const userStore = useUserStore()

const inputRef = ref(null)
const listRef = ref(null)

const state = reactive({
  query: '',
  results: [],
  loading: false,
  activeIndex: 0
})

// QUICK ACTIONS

const quickActions = computed(() => {
  const actions = []
  if (pageStore.id && userStore.can('write:pages')) {
    actions.push({
      id: 'edit',
      icon: 'ph ph-pencil-simple',
      label: 'Edit current page',
      hint: 'Ctrl+E',
      action: () => router.push(`/_edit/${pageStore.path}`)
    })
  }
  if (userStore.can('write:pages')) {
    actions.push(
      {
        id: 'new-md',
        icon: 'ph ph-file-text',
        label: 'New Markdown page',
        action: () => router.push({ path: `/_create/markdown`, query: { path: pageStore.folderPath || undefined } })
      },
      {
        id: 'new-wysiwyg',
        icon: 'ph ph-text-t',
        label: 'New Visual editor page',
        action: () => router.push({ path: `/_create/wysiwyg`, query: { path: pageStore.folderPath || undefined } })
      }
    )
  }
  if (pageStore.id) {
    actions.push({
      id: 'history',
      icon: 'ph ph-clock-counter-clockwise',
      label: 'View page history',
      action: () => siteStore.$patch({ overlay: 'PageHistory' })
    })
    actions.push({
      id: 'source',
      icon: 'ph ph-code',
      label: 'View page source',
      action: () => siteStore.$patch({ overlay: 'PageSource' })
    })
  }
  if (userStore.can('manage:system')) {
    actions.push({
      id: 'admin',
      icon: 'ph ph-gear-six',
      label: 'Go to Admin',
      action: () => router.push('/_admin')
    })
  }
  return actions
})

// SEARCH

const fetchResults = debounce(async (query) => {
  if (!query || query.length < 2) {
    state.results = []
    state.loading = false
    return
  }
  state.loading = true
  try {
    const resp = await APOLLO_CLIENT.query({
      query: gql`
        query cmdPaletteSearch ($query: String!, $siteId: UUID!) {
          searchPages(query: $query, siteId: $siteId, limit: 8) {
            results {
              id
              title
              path
            }
          }
        }
      `,
      variables: { query, siteId: siteStore.id },
      fetchPolicy: 'network-only'
    })
    state.results = resp.data?.searchPages?.results ?? []
  } catch {
    state.results = []
  }
  state.loading = false
}, 200)

watch(() => state.query, (val) => {
  state.activeIndex = 0
  fetchResults(val)
})

// KEYBOARD NAV

const activeListLength = computed(() => {
  return state.query ? state.results.length : quickActions.value.length
})

function onKeyDown (ev) {
  if (ev.key === 'Escape') {
    close()
  } else if (ev.key === 'ArrowDown') {
    ev.preventDefault()
    state.activeIndex = Math.min(state.activeIndex + 1, activeListLength.value - 1)
    scrollActiveIntoView()
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault()
    state.activeIndex = Math.max(state.activeIndex - 1, 0)
    scrollActiveIntoView()
  } else if (ev.key === 'Enter') {
    ev.preventDefault()
    if (state.query && state.results[state.activeIndex]) {
      goToPage(state.results[state.activeIndex])
    } else if (!state.query && quickActions.value[state.activeIndex]) {
      runAction(quickActions.value[state.activeIndex])
    }
  }
}

function scrollActiveIntoView () {
  nextTick(() => {
    const el = listRef.value?.querySelector('.command-palette-item.active')
    el?.scrollIntoView({ block: 'nearest' })
  })
}

// ACTIONS

function close () {
  emit('update:modelValue', false)
}

function goToPage (item) {
  close()
  router.push(`/${item.path}`)
}

function runAction (action) {
  close()
  action.action()
}

// Focus input when opened

watch(() => props.modelValue, (val) => {
  if (val) {
    state.query = ''
    state.results = []
    state.activeIndex = 0
    nextTick(() => inputRef.value?.focus())
  }
})
</script>

<style lang="scss">
.command-palette {
  width: 560px;
  max-width: 95vw;
  background-color: $dark-4;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,.5);
  border: 1px solid rgba(255,255,255,.1);

  @at-root .body--light & {
    background-color: #fff;
    border: 1px solid $grey-4;
    box-shadow: 0 24px 64px rgba(0,0,0,.2);
  }

  &-input {
    display: flex;
    align-items: center;
    padding: 0 14px;
    height: 52px;
  }

  &-icon {
    color: rgba(255,255,255,.4);
    margin-right: 10px;
    flex-shrink: 0;

    @at-root .body--light & {
      color: $grey-6;
    }
  }

  &-field {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #fff;
    font-size: 16px;
    font-family: inherit;

    @at-root .body--light & {
      color: $grey-9;
    }

    &::placeholder {
      color: rgba(255,255,255,.3);

      @at-root .body--light & {
        color: $grey-5;
      }
    }
  }

  &-list {
    max-height: 360px;
    overflow-y: auto;
    padding: 6px 6px 8px;
  }

  &-section-header {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .07em;
    color: rgba(255,255,255,.35);
    padding: 8px 10px 4px;

    @at-root .body--light & {
      color: $grey-6;
    }
  }

  &-item {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    gap: 10px;

    &:hover, &.active {
      background-color: rgba(255,255,255,.1);

      @at-root .body--light & {
        background-color: $grey-2;
      }
    }

    &-icon {
      color: rgba(255,255,255,.5);
      flex-shrink: 0;

      @at-root .body--light & {
        color: $grey-6;
      }
    }

    &-label {
      flex: 1;
      font-size: 14px;
      color: rgba(255,255,255,.9);

      @at-root .body--light & {
        color: $grey-9;
      }
    }

    &-hint {
      font-size: 12px;
      color: rgba(255,255,255,.3);

      @at-root .body--light & {
        color: $grey-6;
      }
    }
  }

  &-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: rgba(255,255,255,.35);
    font-size: 14px;
    gap: 10px;

    @at-root .body--light & {
      color: $grey-6;
    }
  }
}
</style>
