<template lang="pug">
q-page.q-py-md(:style-fn='pageStyle')
  .text-header {{ t('profile.pages') }}
  .q-pa-md
    .text-body2 {{ t('profile.pagesInfo') }}
    q-table.q-mt-lg(
      :rows='state.pages'
      :columns='columns'
      :loading='state.loading > 0'
      row-key='id'
      flat
      bordered
      :pagination='{ rowsPerPage: 20 }'
      :no-data-label='t("profile.pagesNone")'
      )
      template(#body-cell-title='props')
        q-td(:props='props')
          a.text-primary.cursor-pointer(@click='goToPage(props.row)') {{ props.row.title }}
      template(#body-cell-updatedAt='props')
        q-td(:props='props')
          | {{ formatDate(props.row.updatedAt) }}
      template(#body-cell-createdAt='props')
        q-td(:props='props')
          | {{ formatDate(props.row.createdAt) }}

  q-inner-loading(:showing='state.loading > 0')
</template>

<script setup>
import gql from 'graphql-tag'
import { useI18n } from 'vue-i18n'
import { useMeta, useQuasar } from 'quasar'
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { DateTime } from 'luxon'

import { useUserStore } from '@/stores/user'

// QUASAR

const $q = useQuasar()

// STORES

const userStore = useUserStore()

// ROUTER

const router = useRouter()

// I18N

const { t } = useI18n()

// META

useMeta({
  title: t('profile.pages')
})

// DATA

const state = reactive({
  pages: [],
  loading: 0
})

const columns = computed(() => [
  { name: 'title', label: t('profile.pagesTitle'), field: 'title', align: 'left', sortable: true },
  { name: 'path', label: t('profile.pagesPath'), field: 'path', align: 'left', sortable: true },
  { name: 'updatedAt', label: t('profile.pagesUpdatedAt'), field: 'updatedAt', align: 'left', sortable: true },
  { name: 'createdAt', label: t('profile.pagesCreatedAt'), field: 'createdAt', align: 'left', sortable: true }
])

// METHODS

function pageStyle (offset, height) {
  return {
    'min-height': `${height - 100 - offset}px`
  }
}

function formatDate (dateStr) {
  if (!dateStr) return ''
  return DateTime.fromISO(dateStr).toLocaleString(DateTime.DATETIME_MED)
}

function goToPage (page) {
  router.push(`/${page.path}`)
}

async function fetchPages () {
  state.loading++
  try {
    const respRaw = await APOLLO_CLIENT.query({
      query: gql`
        query getUserPages (
          $creatorId: UUID
          $authorId: UUID
        ) {
          pages (
            creatorId: $creatorId
            authorId: $authorId
            orderBy: UPDATED
            orderByDirection: DESC
          ) {
            id
            path
            title
            updatedAt
            createdAt
          }
        }
      `,
      variables: {
        creatorId: userStore.id,
        authorId: userStore.id
      },
      fetchPolicy: 'network-only'
    })
    state.pages = respRaw.data?.pages ?? []
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: t('profile.pagesLoadingFailed'),
      caption: err.message
    })
  }
  state.loading--
}

// MOUNTED

onMounted(() => {
  fetchPages()
})
</script>
