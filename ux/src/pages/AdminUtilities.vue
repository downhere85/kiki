<template lang='pug'>
q-page.admin-utilities
  .row.q-pa-md.items-center
    .col-auto
      img.admin-icon.animated.fadeInLeft(src='/_assets/icons/fluent-swiss-army-knife.svg')
    .col.q-pl-md
      .text-h5.text-primary.animated.fadeInLeft {{ t('admin.utilities.title') }}
      .text-subtitle1.text-grey.animated.fadeInLeft.wait-p2s {{ t('admin.utilities.subtitle') }}
    .col-auto
      q-btn.q-mr-sm.acrylic-btn(
        icon='las la-question-circle'
        flat
        color='grey'
        :aria-label='t(`common.actions.viewDocs`)'
        :href='siteStore.docsBase + `/admin/utilities`'
        target='_blank'
        type='a'
        )
        q-tooltip {{ t(`common.actions.viewDocs`) }}
  q-separator(inset)
  .q-pa-md.q-gutter-md
    q-card
      q-list(separator)
        q-item
          blueprint-icon(icon='disconnected', :hue-rotate='45')
          q-item-section
            q-item-label {{t(`admin.utilities.disconnectWS`)}}
            q-item-label(caption) {{t(`admin.utilities.disconnectWSHint`)}}
          q-item-section(side)
            q-btn.acrylic-btn(
              flat
              icon='las la-arrow-circle-right'
              color='primary'
              @click='disconnectWS'
              :label='t(`common.actions.proceed`)'
            )
        q-item
          blueprint-icon(icon='datalake', :hue-rotate='45')
          q-item-section
            q-item-label {{t(`admin.utilities.flushCache`)}}
            q-item-label(caption) {{t(`admin.utilities.flushCacheHint`)}}
          q-item-section(side)
            q-btn.acrylic-btn(
              flat
              icon='las la-arrow-circle-right'
              color='primary'
              @click='flushCache'
              :label='t(`common.actions.proceed`)'
            )
        q-item
          blueprint-icon(icon='historical', :hue-rotate='45')
          q-item-section
            q-item-label {{t(`admin.utilities.purgeHistory`)}}
            q-item-label(caption) {{t(`admin.utilities.purgeHistoryHint`)}}
          q-item-section(side)
            q-select(
              outlined
              :label='t(`admin.utilities.purgeHistoryTimeframe`)'
              v-model='state.purgeHistoryTimeframe'
              style='min-width: 175px;'
              emit-value
              map-options
              dense
              :options='purgeHistoryTimeframes'
            )
          q-separator.q-ml-sm(vertical)
          q-item-section(side)
            q-btn.acrylic-btn(
              flat
              icon='las la-arrow-circle-right'
              color='primary'
              @click='purgeHistory'
              :label='t(`common.actions.proceed`)'
            )
        q-item
          blueprint-icon(icon='rescan-document', :hue-rotate='45')
          q-item-section
            q-item-label Rebuild Search Index
            q-item-label(caption) Force a full rebuild of the search index. Use if search results appear stale or incomplete.
          q-item-section(side)
            q-btn.acrylic-btn(
              flat
              icon='las la-arrow-circle-right'
              color='primary'
              @click='rebuildSearchIndex'
              :label='t(`common.actions.proceed`)'
            )
        q-item
          blueprint-icon(icon='matches', :hue-rotate='45')
          q-item-section
            q-item-label {{t(`admin.utilities.invalidAuthCertificates`)}}
            q-item-label(caption) {{t(`admin.utilities.invalidAuthCertificatesHint`)}}
          q-item-section(side)
            q-btn.acrylic-btn(
              flat
              icon='las la-arrow-circle-right'
              color='primary'
              @click='invalidateAuthCertificates'
              :label='t(`common.actions.proceed`)'
            )
        q-item
          blueprint-icon(icon='database-export', :hue-rotate='45')
          q-item-section
            q-item-label {{t(`admin.utilities.export`)}}
            q-item-label(caption) {{t(`admin.utilities.exportHint`)}}
          q-item-section(side)
            q-btn.acrylic-btn(
              flat
              icon='las la-arrow-circle-right'
              color='grey'
              disabled
              :label='t(`common.actions.proceed`)'
            )
        q-item
          blueprint-icon(icon='database-restore', :hue-rotate='45')
          q-item-section
            q-item-label {{t(`admin.utilities.import`)}}
            q-item-label(caption) {{t(`admin.utilities.importHint`)}}
          q-item-section(side)
            q-btn.acrylic-btn(
              flat
              icon='las la-arrow-circle-right'
              color='grey'
              disabled
              :label='t(`common.actions.proceed`)'
            )
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useMeta, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import gql from 'graphql-tag'

import { useSiteStore } from '@/stores/site'

// QUASAR

const $q = useQuasar()

// STORES

const siteStore = useSiteStore()

// I18N

const { t } = useI18n()

// META

useMeta({
  title: t('admin.utilities.title')
})

// DATA

const state = reactive({
  purgeHistoryTimeframe: '1y'
})

// COMPUTED

const purgeHistoryTimeframes = computed(() => ([
  { value: 'P1D', label: t('admin.utitilies.purgeHistoryToday') },
  { value: 'P1M', label: t('admin.utitilies.purgeHistoryMonth', 1, { count: 1 }) },
  { value: 'P3M', label: t('admin.utitilies.purgeHistoryMonth', 3, { count: 3 }) },
  { value: 'P6M', label: t('admin.utitilies.purgeHistoryMonth', 6, { count: 6 }) },
  { value: 'P1Y', label: t('admin.utitilies.purgeHistoryYear', 1, { count: 1 }) },
  { value: 'P2Y', label: t('admin.utitilies.purgeHistoryYear', 2, { count: 2 }) }
]))

// METHODS

async function runMutation (mutationName, mutation, successMsg) {
  $q.loading.show()
  try {
    const resp = await APOLLO_CLIENT.mutate({
      mutation,
      fetchPolicy: 'network-only'
    })
    const result = resp?.data?.[mutationName]?.operation
    if (result?.succeeded) {
      $q.notify({ type: 'positive', message: successMsg })
    } else {
      throw new Error(result?.message || 'Operation failed')
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: `Operation failed: ${err.message}`
    })
  }
  $q.loading.hide()
}

function disconnectWS () {
  $q.dialog({
    title: t('admin.utilities.disconnectWS'),
    message: 'This will disconnect all active WebSocket sessions. Users will need to refresh their browser.',
    cancel: true
  }).onOk(() => {
    runMutation('disconnectWS', gql`
      mutation { disconnectWS { operation { succeeded message } } }
    `, t('admin.utilities.disconnectWSSuccess'))
  })
}

function flushCache () {
  $q.dialog({
    title: t('admin.utilities.flushCache'),
    message: 'This will flush the entire page cache. Pages will be re-rendered on next access.',
    cancel: true
  }).onOk(() => {
    runMutation('flushCache', gql`
      mutation { flushCache { operation { succeeded message } } }
    `, 'Page cache flushed successfully.')
  })
}

function purgeHistory () {
  $q.dialog({
    title: t('admin.utilities.purgeHistory'),
    message: `This will permanently delete page history older than the selected timeframe. This action cannot be undone.`,
    cancel: true
  }).onOk(() => {
    runMutation('purgePagesHistory', gql`
      mutation purge($olderThan: String!) {
        purgePagesHistory(olderThan: $olderThan) {
          operation { succeeded message }
        }
      }
    `, 'Page history purged successfully.')
  })
}

function rebuildSearchIndex () {
  $q.dialog({
    title: 'Rebuild Search Index',
    message: 'This will queue a full rebuild of the search index. This may take a while for large wikis.',
    cancel: true
  }).onOk(() => {
    runMutation('rebuildSearchIndex', gql`
      mutation { rebuildSearchIndex { operation { succeeded message } } }
    `, 'Search index rebuild queued successfully.')
  })
}

function invalidateAuthCertificates () {
  $q.dialog({
    title: t('admin.utilities.invalidAuthCertificates'),
    message: 'This will regenerate authentication certificates. All users will be logged out and need to sign in again.',
    cancel: true
  }).onOk(async () => {
    // Auth certificate regeneration requires server restart
    $q.notify({
      type: 'info',
      message: 'Auth certificate invalidation requires a server restart. Please restart the Wiki.js server.'
    })
  })
}
</script>

<style lang='scss'>

</style>
