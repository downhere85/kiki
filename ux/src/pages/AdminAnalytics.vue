<template lang='pug'>
q-page.admin-analytics
  .row.q-pa-md.items-center
    .col-auto
      img.admin-icon.animated.fadeInLeft(src='/_assets/icons/fluent-combo-chart.svg')
    .col.q-pl-md
      .text-h5.text-primary.animated.fadeInLeft {{ t('admin.analytics.title') }}
      .text-subtitle1.text-grey.animated.fadeInLeft.wait-p2s {{ t('admin.analytics.subtitle') }}
    .col-auto
      q-btn.q-mr-sm.acrylic-btn(
        icon='ph ph-question'
        flat
        color='grey'
        :aria-label='t(`common.actions.viewDocs`)'
        :href='siteStore.docsBase + `/admin/analytics`'
        target='_blank'
        type='a'
        )
        q-tooltip {{ t(`common.actions.viewDocs`) }}
      q-btn.q-mr-sm.acrylic-btn(
        icon='ph ph-arrow-clockwise'
        flat
        color='secondary'
        :loading='state.loading > 0'
        :aria-label='t(`common.actions.refresh`)'
        @click='load'
        )
        q-tooltip {{ t(`common.actions.refresh`) }}
      q-btn(
        unelevated
        icon='mdi-check'
        :label='t(`common.actions.apply`)'
        color='secondary'
        @click='save'
        :disabled='state.loading > 0'
      )
  q-separator(inset)
  .row.q-pa-md.q-col-gutter-md
    .col-auto
      q-card.rounded-borders.bg-dark(style='min-width: 300px;')
        q-list(padding, dark)
          q-item(
            v-for='p of state.providers'
            :key='p.key'
            clickable
            :active='state.selectedKey === p.key'
            active-class='bg-primary text-white'
            @click='state.selectedKey = p.key'
            :disable='!p.isAvailable'
            )
            q-item-section(side)
              q-icon(
                :name='p.isEnabled ? `ph ph-check-square` : `ph ph-square`'
                :color='!p.isAvailable ? `grey` : (p.isEnabled ? `positive` : `grey-5`)'
                @click.stop='p.isEnabled = !p.isEnabled'
                )
            q-item-section
              q-item-label {{ p.title }}
              q-item-label(caption) {{ p.description }}
            q-item-section(v-if='state.selectedKey === p.key', side)
              q-icon(name='ph ph-caret-right', color='white')
    .col(v-if='selectedProvider')
      q-card
        q-bar.bg-primary.text-white
          span {{ selectedProvider.title }}
          q-space
          q-toggle(
            v-model='selectedProvider.isEnabled'
            color='white'
            dark
            label='Active'
            left-label
            )
        q-card-section.bg-blue-1(v-if='selectedProvider.description')
          .row.items-center
            .col
              .text-body2 {{ selectedProvider.description }}
              a.text-caption(:href='selectedProvider.website', target='_blank') {{ selectedProvider.website }}
            .col-auto(v-if='selectedProvider.logo')
              img(:src='selectedProvider.logo', :alt='selectedProvider.title', style='max-height: 40px; max-width: 100px;')
        q-card-section
          .text-overline.q-mb-md {{ t('admin.analytics.providerConfiguration') }}
          .text-body2.text-grey(v-if='!selectedProvider.config || selectedProvider.config.length < 1')
            em {{ t('admin.analytics.providerNoConfiguration') }}
          template(v-else)
            template(v-for='cfg in selectedProvider.config', :key='cfg.key')
              q-select.q-mb-md(
                v-if='cfg.value.type === "string" && cfg.value.enum'
                outlined
                :options='cfg.value.enum'
                :label='cfg.value.title'
                v-model='cfg.value.value'
                :hint='cfg.value.hint || ""'
                )
              q-toggle.q-mb-md(
                v-else-if='cfg.value.type === "boolean"'
                :label='cfg.value.title'
                v-model='cfg.value.value'
                color='primary'
                )
                template(v-if='cfg.value.hint')
                  .text-caption.text-grey {{ cfg.value.hint }}
              q-input.q-mb-md(
                v-else-if='cfg.value.type === "string" && cfg.value.multiline'
                outlined
                type='textarea'
                :label='cfg.value.title'
                v-model='cfg.value.value'
                :hint='cfg.value.hint || ""'
                )
              q-input.q-mb-md(
                v-else
                outlined
                :label='cfg.value.title'
                v-model='cfg.value.value'
                :hint='cfg.value.hint || ""'
                )
</template>

<script setup>
import { useMeta, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, reactive, watch } from 'vue'
import gql from 'graphql-tag'
import { cloneDeep, pick, sortBy } from 'lodash-es'

import { useAdminStore } from '@/stores/admin'
import { useSiteStore } from '@/stores/site'

// QUASAR

const $q = useQuasar()

// STORES

const adminStore = useAdminStore()
const siteStore = useSiteStore()

// I18N

const { t } = useI18n()

// META

useMeta({
  title: t('admin.analytics.title')
})

// STATE

const state = reactive({
  loading: 0,
  providers: [],
  selectedKey: ''
})

const selectedProvider = computed(() => {
  return state.providers.find(p => p.key === state.selectedKey) || null
})

// METHODS

async function load () {
  state.loading++
  try {
    const resp = await APOLLO_CLIENT.query({
      query: gql`
        query {
          analyticsProviders {
            isEnabled
            key
            title
            description
            isAvailable
            logo
            website
            config {
              key
              value
            }
          }
        }
      `,
      fetchPolicy: 'network-only'
    })
    state.providers = cloneDeep(resp?.data?.analyticsProviders || []).map(p => ({
      ...p,
      config: sortBy(
        (p.config || []).map(cfg => ({
          ...cfg,
          value: JSON.parse(cfg.value)
        })),
        [c => c.value.order]
      )
    }))
    if (!state.selectedKey && state.providers.length > 0) {
      state.selectedKey = state.providers[0].key
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load analytics providers.',
      caption: err.message
    })
  }
  state.loading--
}

async function save () {
  state.loading++
  try {
    const resp = await APOLLO_CLIENT.mutate({
      mutation: gql`
        mutation ($providers: [AnalyticsProviderInput]!) {
          updateAnalyticsProviders(providers: $providers) {
            operation {
              succeeded
              message
            }
          }
        }
      `,
      variables: {
        providers: state.providers.map(p => ({
          isEnabled: p.isEnabled,
          key: p.key,
          config: (p.config || []).map(cfg => ({
            key: cfg.key,
            value: JSON.stringify({ v: cfg.value.value })
          }))
        }))
      }
    })
    if (resp?.data?.updateAnalyticsProviders?.operation?.succeeded) {
      $q.notify({
        type: 'positive',
        message: t('admin.analytics.saveSuccess')
      })
    } else {
      throw new Error(resp?.data?.updateAnalyticsProviders?.operation?.message || 'An unexpected error occurred.')
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to save analytics providers.',
      caption: err.message
    })
  }
  state.loading--
}

// MOUNTED

onMounted(() => {
  load()
})
</script>

<style lang='scss'>
</style>
