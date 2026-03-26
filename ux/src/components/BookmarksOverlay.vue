<template lang="pug">
q-layout(view='hHh lpR fFf', container)
  q-header.card-header.q-px-md.q-py-sm
    q-icon(name='las la-bookmark', left, size='md')
    span Bookmarks
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
      q-list(bordered, separator)
        q-item(
          v-if='state.bookmarks.length === 0 && state.loading < 1'
          )
          q-item-section
            span.text-grey No bookmarks yet. Click the bookmark icon on any page to add it here.
        q-item(
          v-for='page of state.bookmarks'
          :key='page.id'
          clickable
          @click='goToPage(page)'
          )
          q-item-section(avatar)
            q-icon(name='las la-file-alt', color='primary')
          q-item-section
            q-item-label {{ page.title }}
            q-item-label(caption) /{{ page.path }}
          q-item-section(side)
            q-btn(
              icon='las la-times'
              flat
              dense
              size='sm'
              color='grey'
              @click.stop='removeBookmark(page.id)'
              )

      q-inner-loading(:showing='state.loading > 0')
</template>

<script setup>
import gql from 'graphql-tag'
import { useQuasar } from 'quasar'
import { onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'

import { useSiteStore } from '@/stores/site'

const $q = useQuasar()
const siteStore = useSiteStore()
const router = useRouter()

const state = reactive({
  bookmarks: [],
  loading: 0
})

function close () {
  siteStore.$patch({ overlay: '' })
}

function goToPage (page) {
  close()
  router.push(`/${page.path}`)
}

async function fetchBookmarks () {
  state.loading++
  try {
    const resp = await APOLLO_CLIENT.query({
      query: gql`
        query myBookmarks {
          myBookmarks {
            id
            path
            title
            updatedAt
          }
        }
      `,
      fetchPolicy: 'network-only'
    })
    state.bookmarks = resp.data?.myBookmarks ?? []
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load bookmarks.' })
  }
  state.loading--
}

async function removeBookmark (pageId) {
  try {
    await APOLLO_CLIENT.mutate({
      mutation: gql`
        mutation toggleBookmark ($pageId: UUID!) {
          toggleBookmark(pageId: $pageId) {
            operation { succeeded message }
          }
        }
      `,
      variables: { pageId }
    })
    state.bookmarks = state.bookmarks.filter(b => b.id !== pageId)
    $q.notify({ type: 'positive', message: 'Bookmark removed.' })
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to remove bookmark.' })
  }
}

onMounted(() => {
  fetchBookmarks()
})
</script>
