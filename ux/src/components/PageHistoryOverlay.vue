<template lang="pug">
q-layout(view='hHh lpR fFf', container)
  q-header.card-header.q-px-md.q-py-sm
    q-icon(name='las la-history', left, size='md')
    span Page History
    q-space
    transition(name='syncing')
      q-spinner-tail.q-mr-sm(
        v-show='state.loading > 0'
        color='accent'
        size='24px'
      )
    q-btn(
      icon='las la-times'
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
            icon='las la-arrow-left'
            flat
            dense
            label='Back to history'
            no-caps
            @click='state.selectedVersion = null'
            )
          q-space
          q-btn(
            icon='las la-undo'
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
            pre.page-history-content(v-text='state.selectedVersion.content')

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
import { onMounted, reactive } from 'vue'
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
  loading: 0
})

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
    case 'edit': return 'las la-pen'
    case 'initial': return 'las la-plus'
    case 'move': return 'las la-arrows-alt'
    default: return 'las la-history'
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
</style>
