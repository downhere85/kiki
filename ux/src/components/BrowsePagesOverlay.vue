<template lang="pug">
q-layout(view='hHh lpR fFf', container)
  q-header.card-header.q-px-md.q-py-sm
    q-icon(name='las la-sitemap', left, size='md')
    span Browse Pages
    q-space
    q-btn(
      icon='las la-times'
      color='pink-2'
      dense
      flat
      @click='close'
      )

  q-page-container
    q-page.q-pa-md
      q-input.q-mb-md(
        v-model='state.search'
        outlined
        dense
        placeholder='Filter pages...'
        clearable
        )
        template(#prepend)
          q-icon(name='mdi-magnify')
      q-scroll-area(style='height: calc(100vh - 160px);')
        q-list(bordered, separator)
          q-item(
            v-if='filteredPages.length === 0 && state.loading < 1'
            )
            q-item-section
              span.text-grey No pages found.
          q-item(
            v-for='page of filteredPages'
            :key='page.id'
            clickable
            @click='goToPage(page)'
            )
            q-item-section(avatar)
              q-avatar(
                :color='page.isPublished ? "primary" : "grey"'
                text-color='white'
                rounded
                size='sm'
                )
                q-icon(name='las la-file-alt', size='xs')
            q-item-section
              q-item-label {{ page.title }}
              q-item-label(caption) /{{ page.path }}
            q-item-section(side)
              .text-caption.text-grey {{ formatDate(page.updatedAt) }}

      q-inner-loading(:showing='state.loading > 0')
</template>

<script setup>
import gql from 'graphql-tag'
import { useQuasar } from 'quasar'
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { DateTime } from 'luxon'

import { useSiteStore } from '@/stores/site'

// QUASAR

const $q = useQuasar()

// STORES

const siteStore = useSiteStore()

// ROUTER

const router = useRouter()

// DATA

const state = reactive({
  pages: [],
  search: '',
  loading: 0
})

// COMPUTED

const filteredPages = computed(() => {
  if (!state.search) return state.pages
  const q = state.search.toLowerCase()
  return state.pages.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.path.toLowerCase().includes(q)
  )
})

// METHODS

function close () {
  siteStore.$patch({ overlay: '' })
}

function formatDate (dateStr) {
  if (!dateStr) return ''
  return DateTime.fromISO(dateStr).toRelative()
}

function goToPage (page) {
  close()
  router.push(`/${page.path}`)
}

async function fetchPages () {
  state.loading++
  try {
    const resp = await APOLLO_CLIENT.query({
      query: gql`
        query browsePages {
          pages (
            orderBy: TITLE
            orderByDirection: ASC
          ) {
            id
            path
            title
            updatedAt
            isPublished
          }
        }
      `,
      fetchPolicy: 'network-only'
    })
    state.pages = resp.data?.pages ?? []
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load pages.',
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
