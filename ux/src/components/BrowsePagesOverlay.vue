<template lang="pug">
q-layout(view='hHh lpR fFf', container)
  q-header.card-header.q-px-md.q-py-sm
    q-icon(name='ph ph-tree-structure', left, size='md')
    span Browse Pages
    q-space
    q-btn(
      icon='ph ph-x'
      color='pink-2'
      dense
      flat
      @click='close'
      )

  q-page-container
    q-page.q-pa-md
      //- Breadcrumb navigation
      .browse-breadcrumbs.q-mb-md
        q-breadcrumbs(active-color='grey-7', separator-color='grey')
          template(v-slot:separator)
            q-icon(name='ph ph-caret-right')
          q-breadcrumbs-el(
            icon='ph ph-house'
            label='Root'
            clickable
            @click='navigateTo("")'
            )
          q-breadcrumbs-el(
            v-for='(crumb, idx) of breadcrumbs'
            :key='idx'
            :label='crumb.label'
            clickable
            @click='navigateTo(crumb.path)'
            )

      //- Search filter
      q-input.q-mb-md(
        v-model='state.search'
        outlined
        dense
        placeholder='Filter...'
        clearable
        )
        template(#prepend)
          q-icon(name='mdi-magnify')

      //- Folder and page listing
      q-scroll-area(style='height: calc(100vh - 200px);')
        q-list(separator)
          //- Loading
          q-item(v-if='state.loading > 0')
            q-item-section
              q-spinner.q-mr-sm(size='sm')
              span.text-grey Loading...

          //- Empty state
          q-item(v-else-if='displayItems.length === 0')
            q-item-section
              span.text-grey No items found.

          //- Folders
          q-item(
            v-for='item of displayItems'
            :key='item.path'
            clickable
            @click='item.isFolder ? navigateTo(item.path) : goToPage(item)'
            :class='{ "browse-folder": item.isFolder }'
            )
            q-item-section(avatar)
              q-icon(
                :name='item.isFolder ? "ph ph-folder" : "ph ph-file-text"'
                :color='item.isFolder ? "amber-8" : "primary"'
                size='sm'
                )
            q-item-section
              q-item-label {{ item.title }}
              q-item-label(caption, v-if='!item.isFolder') /{{ item.path }}
              q-item-label(caption, v-if='item.isFolder && item.count > 0') {{ item.count }} items
            q-item-section(side, v-if='item.isFolder')
              q-icon(name='ph ph-caret-right', color='grey')

      q-inner-loading(:showing='state.loading > 0')
</template>

<script setup>
import gql from 'graphql-tag'
import { useQuasar } from 'quasar'
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'

import { useSiteStore } from '@/stores/site'

const $q = useQuasar()
const siteStore = useSiteStore()
const router = useRouter()

const state = reactive({
  allPages: [],
  currentPath: '',
  search: '',
  loading: 0
})

// Breadcrumbs from current path
const breadcrumbs = computed(() => {
  if (!state.currentPath) return []
  const parts = state.currentPath.split('/')
  return parts.map((part, idx) => ({
    label: part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    path: parts.slice(0, idx + 1).join('/')
  }))
})

// Build folder tree from current path
const displayItems = computed(() => {
  const prefix = state.currentPath ? state.currentPath + '/' : ''
  const searchQ = (state.search || '').toLowerCase()

  // If searching, show flat filtered results from anywhere
  if (searchQ) {
    return state.allPages
      .filter(p => p.title.toLowerCase().includes(searchQ) || p.path.toLowerCase().includes(searchQ))
      .slice(0, 50)
      .map(p => ({ ...p, isFolder: false }))
  }

  // Collect folders and pages at current level
  const folders = new Map()
  const pages = []

  for (const page of state.allPages) {
    if (!page.path.startsWith(prefix) && prefix) continue
    if (page.path === state.currentPath) continue // skip the index page itself

    const remainder = prefix ? page.path.slice(prefix.length) : page.path
    const slashIdx = remainder.indexOf('/')

    if (slashIdx >= 0) {
      // This page is in a subfolder
      const folderName = remainder.slice(0, slashIdx)
      const folderPath = prefix + folderName
      if (!folders.has(folderPath)) {
        folders.set(folderPath, { count: 0, title: folderName })
      }
      folders.get(folderPath).count++
    } else {
      // Direct child page
      pages.push({ ...page, isFolder: false })
    }
  }

  // Convert folders map to sorted array
  const folderItems = Array.from(folders.entries()).map(([path, info]) => {
    // Check if there's an index page for this folder
    const indexPage = state.allPages.find(p => p.path === path)
    return {
      path,
      title: indexPage?.title || info.title.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      count: info.count,
      isFolder: true
    }
  }).sort((a, b) => a.title.localeCompare(b.title))

  // Sort pages by title
  pages.sort((a, b) => a.title.localeCompare(b.title))

  return [...folderItems, ...pages]
})

function close () {
  siteStore.$patch({ overlay: '' })
}

function navigateTo (path) {
  state.currentPath = path
  state.search = ''
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
            publishState
          }
        }
      `,
      fetchPolicy: 'network-only'
    })
    state.allPages = resp.data?.pages ?? []
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load pages.',
      caption: err.message
    })
  }
  state.loading--
}

onMounted(() => {
  fetchPages()
})
</script>

<style lang="scss">
.browse-breadcrumbs {
  padding: 4px 0;
}

.browse-folder {
  .q-item__section--avatar {
    min-width: 32px;
  }
}
</style>
