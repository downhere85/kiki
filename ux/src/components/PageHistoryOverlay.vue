<template lang="pug">
q-layout(view='hHh lpR fFf', container)
  q-header.card-header.q-px-md.q-py-sm
    q-icon(name='ph ph-clock-counter-clockwise', left, size='md')
    span Page History
    q-space
    transition(name='syncing')
      q-spinner-tail.q-mr-sm(
        v-show='state.loading > 0'
        color='accent'
        size='24px'
      )
    q-btn(
      icon='ph ph-x'
      color='pink-2'
      dense
      flat
      @click='close'
      )
      q-tooltip(anchor='bottom middle', self='top middle') Close

  q-page-container
    q-page.q-pa-md
      //- VERSION DETAIL VIEW
      template(v-if='state.selectedVersion')
        .row.items-center.q-mb-md
          q-btn(
            icon='ph ph-arrow-left'
            flat
            dense
            label='Back to history'
            no-caps
            @click='state.selectedVersion = null'
            )
          q-space
          q-btn-toggle.q-mr-sm(
            v-model='state.viewMode'
            no-caps
            rounded
            unelevated
            toggle-color='primary'
            :options='[{label: `Raw`, value: `raw`}, {label: `Diff`, value: `diff`}]'
            size='sm'
            )
          q-btn(
            icon='ph ph-arrow-counter-clockwise'
            color='warning'
            label='Restore this version'
            no-caps
            unelevated
            @click='restoreVersion'
            )
        q-card(flat, bordered)
          q-card-section
            .text-subtitle1 {{ state.selectedVersion.title }}
            .text-caption.text-grey {{ formatDate(state.selectedVersion.versionDate) }} — {{ state.selectedVersion.authorName || 'Unknown' }}
          q-separator
          q-card-section
            //- RAW VIEW
            pre.page-history-content(v-if='state.viewMode === `raw`', v-text='state.selectedVersion.content')
            //- DIFF VIEW
            .page-history-diff(v-else)
              .page-history-diff-legend.q-mb-sm.flex.items-center.q-gutter-x-sm
                span.diff-legend-removed Removed
                span.diff-legend-added Added
              pre.page-history-content
                span(
                  v-for='(chunk, idx) of computedDiff'
                  :key='idx'
                  :class='{ "diff-removed": chunk.removed, "diff-added": chunk.added }'
                  ) {{ chunk.value }}

      //- HISTORY TRAIL
      template(v-else)
        .text-body2.q-mb-md Page revision history
        q-list(bordered, separator)
          q-item(
            v-if='state.trail.length === 0 && state.loading < 1'
            )
            q-item-section
              span.text-grey No history available for this page.
          q-item(
            v-for='entry of state.trail'
            :key='entry.versionId'
            clickable
            @click='loadVersion(entry.versionId)'
            )
            q-item-section(avatar)
              q-avatar(
                :color='actionColor(entry.actionType)'
                text-color='white'
                rounded
                size='sm'
                )
                q-icon(:name='actionIcon(entry.actionType)', size='xs')
            q-item-section
              q-item-label {{ entry.authorName || 'Unknown' }}
              q-item-label(caption) {{ formatDate(entry.versionDate) }}
            q-item-section(side)
              q-badge(:color='actionColor(entry.actionType)', :label='entry.actionType')

      q-inner-loading(:showing='state.loading > 0')
</template>

<script setup>
import gql from 'graphql-tag'
import { useQuasar } from 'quasar'
import { computed, onMounted, reactive } from 'vue'
import { DateTime } from 'luxon'

import { usePageStore } from '@/stores/page'
import { useSiteStore } from '@/stores/site'

// QUASAR

const $q = useQuasar()

// STORES

const pageStore = usePageStore()
const siteStore = useSiteStore()

// DATA

const state = reactive({
  trail: [],
  selectedVersion: null,
  viewMode: 'raw',
  loading: 0
})

// COMPUTED

const computedDiff = computed(() => {
  if (!state.selectedVersion) return []
  return lineDiff(state.selectedVersion.content || '', pageStore.content || '')
})

// Simple line-level diff (Myers-inspired LCS)
function lineDiff (oldText, newText) {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const m = oldLines.length
  const n = newLines.length

  // Build LCS table
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to build chunks
  const chunks = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      chunks.unshift({ value: oldLines[i - 1] + '\n' })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      chunks.unshift({ value: newLines[j - 1] + '\n', added: true })
      j--
    } else {
      chunks.unshift({ value: oldLines[i - 1] + '\n', removed: true })
      i--
    }
  }
  return chunks
}

// METHODS

function close () {
  siteStore.$patch({ overlay: '' })
}

function formatDate (dateStr) {
  if (!dateStr) return ''
  return DateTime.fromISO(dateStr).toLocaleString(DateTime.DATETIME_MED)
}

function actionColor (type) {
  switch (type) {
    case 'edit': return 'primary'
    case 'initial': return 'positive'
    case 'move': return 'orange'
    default: return 'grey'
  }
}

function actionIcon (type) {
  switch (type) {
    case 'edit': return 'ph ph-pen'
    case 'initial': return 'ph ph-plus'
    case 'move': return 'ph ph-arrows-out'
    default: return 'ph ph-clock-counter-clockwise'
  }
}

async function fetchHistory () {
  state.loading++
  try {
    const resp = await APOLLO_CLIENT.query({
      query: gql`
        query getPageHistory ($id: UUID!) {
          pageHistoryById(id: $id) {
            trail {
              versionId
              versionDate
              authorId
              authorName
              actionType
            }
            total
          }
        }
      `,
      variables: { id: pageStore.id },
      fetchPolicy: 'network-only'
    })
    state.trail = resp.data?.pageHistoryById?.trail ?? []
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load page history.',
      caption: err.message
    })
  }
  state.loading--
}

async function loadVersion (versionId) {
  state.loading++
  try {
    const resp = await APOLLO_CLIENT.query({
      query: gql`
        query getPageVersion ($pageId: UUID!, $versionId: UUID!) {
          pageVersionById(pageId: $pageId, versionId: $versionId) {
            versionId
            versionDate
            authorName
            title
            content
            description
            action
          }
        }
      `,
      variables: { pageId: pageStore.id, versionId },
      fetchPolicy: 'network-only'
    })
    state.selectedVersion = resp.data?.pageVersionById ?? null
    state.viewMode = 'diff'
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load page version.',
      caption: err.message
    })
  }
  state.loading--
}

async function restoreVersion () {
  $q.dialog({
    title: 'Restore Version',
    message: 'Are you sure you want to restore this version? The current page content will be replaced.',
    cancel: true,
    persistent: false
  }).onOk(async () => {
    state.loading++
    try {
      await APOLLO_CLIENT.mutate({
        mutation: gql`
          mutation restorePage ($pageId: UUID!, $versionId: UUID!) {
            restorePage(pageId: $pageId, versionId: $versionId) {
              operation {
                succeeded
                message
              }
            }
          }
        `,
        variables: {
          pageId: pageStore.id,
          versionId: state.selectedVersion.versionId
        }
      })
      $q.notify({ type: 'positive', message: 'Page restored successfully.' })
      state.selectedVersion = null
      await fetchHistory()
      // Reload the page content
      await pageStore.pageLoad({ id: pageStore.id })
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: 'Failed to restore page version.',
        caption: err.message
      })
    }
    state.loading--
  })
}

// MOUNTED

onMounted(() => {
  fetchHistory()
})
</script>

<style lang="scss">
.page-history-content {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.diff-removed {
  background-color: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  text-decoration: line-through;
}

.diff-added {
  background-color: rgba(34, 197, 94, 0.2);
  color: #86efac;
}

.diff-legend-removed {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 4px;
  background-color: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.diff-legend-added {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 4px;
  background-color: rgba(34, 197, 94, 0.2);
  color: #86efac;
}
</style>
