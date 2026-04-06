<template lang="pug">
q-dialog.page-picker-dialog(ref='dialogRef', @hide='onDialogHide')
  q-card(style='width: 650px; max-width: 90vw;')
    q-card-section.card-header
      q-icon(name='ph ph-tree-structure', left, size='sm')
      span Browse Pages
    q-card-section.q-pt-sm.q-pb-none
      //- Breadcrumbs
      .q-mb-sm
        q-breadcrumbs(active-color='grey-7', separator-color='grey')
          template(v-slot:separator)
            q-icon(name='ph ph-caret-right', size='xs')
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
      //- Filter
      q-input(
        v-model='state.filter'
        outlined
        dense
        placeholder='Filter by title or path...'
        autofocus
        clearable
        @update:model-value='state.selected = null'
      )
        template(#prepend)
          q-icon(name='ph ph-magnifying-glass')
    q-card-section.q-pt-sm(style='height: 400px; overflow: hidden;')
      q-scroll-area(style='height: 100%;')
        q-list(separator)
          q-item(v-if='state.loading')
            q-item-section.text-center
              q-spinner(size='sm')
              .text-grey.q-mt-sm Loading pages...
          q-item(v-else-if='displayItems.length === 0')
            q-item-section
              .text-grey No items found.
          q-item(
            v-for='item of displayItems'
            :key='item.path'
            clickable
            v-ripple
            @click='onItemClick(item)'
            @dblclick='onItemDblClick(item)'
            :active='state.selected === item.path && !item.isFolder'
            active-class='bg-primary text-white'
            )
            q-item-section(avatar)
              q-icon(
                :name='item.isFolder ? "ph ph-folder" : "ph ph-file-text"'
                :color='item.isFolder ? "amber-8" : (state.selected === item.path ? "white" : "grey-7")'
                size='sm'
                )
            q-item-section
              q-item-label {{ item.title }}
              q-item-label(
                v-if='!item.isFolder'
                :class='state.selected === item.path ? "text-white-7" : ""'
                caption
                ) /{{ item.path }}
              q-item-label(v-if='item.isFolder && item.count > 0', caption) {{ item.count }} items
            q-item-section(side, v-if='item.isFolder')
              q-icon(name='ph ph-caret-right', color='grey')
    q-card-actions(align='right')
      q-btn(flat, label='Cancel', color='grey', @click='onDialogCancel')
      q-btn(
        flat
        label='Select'
        color='primary'
        :disable='!state.selected'
        @click='onDialogOK("/" + state.selected)'
      )
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import gql from 'graphql-tag'

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const state = reactive({
  filter: '',
  pages: [],
  loading: true,
  selected: null,
  currentPath: ''
})

const breadcrumbs = computed(() => {
  if (!state.currentPath) return []
  const parts = state.currentPath.split('/')
  return parts.map((part, idx) => ({
    label: part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    path: parts.slice(0, idx + 1).join('/')
  }))
})

const displayItems = computed(() => {
  const prefix = state.currentPath ? state.currentPath + '/' : ''
  const searchQ = (state.filter || '').toLowerCase()

  // Global search mode
  if (searchQ) {
    return state.pages
      .filter(p =>
        (p.title && p.title.toLowerCase().includes(searchQ)) ||
        (p.path && p.path.toLowerCase().includes(searchQ))
      )
      .slice(0, 50)
      .map(p => ({ ...p, isFolder: false }))
  }

  // Folder browsing mode
  const folders = new Map()
  const pages = []

  for (const page of state.pages) {
    if (prefix && !page.path.startsWith(prefix)) continue
    if (page.path === state.currentPath) continue

    const remainder = prefix ? page.path.slice(prefix.length) : page.path
    const slashIdx = remainder.indexOf('/')

    if (slashIdx >= 0) {
      const folderName = remainder.slice(0, slashIdx)
      const folderPath = prefix + folderName
      if (!folders.has(folderPath)) {
        folders.set(folderPath, { count: 0, title: folderName })
      }
      folders.get(folderPath).count++
    } else {
      pages.push({ ...page, isFolder: false })
    }
  }

  const folderItems = Array.from(folders.entries()).map(([path, info]) => {
    const indexPage = state.pages.find(p => p.path === path)
    return {
      path,
      title: indexPage?.title || info.title.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      count: info.count,
      isFolder: true
    }
  }).sort((a, b) => a.title.localeCompare(b.title))

  pages.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  return [...folderItems, ...pages]
})

function navigateTo (path) {
  state.currentPath = path
  state.filter = ''
  state.selected = null
}

function onItemClick (item) {
  if (item.isFolder) {
    navigateTo(item.path)
  } else {
    state.selected = item.path
  }
}

function onItemDblClick (item) {
  if (!item.isFolder) {
    onDialogOK('/' + item.path)
  }
}

async function loadPages () {
  try {
    const resp = await APOLLO_CLIENT.query({
      query: gql`
        query getNavPageList {
          pages(
            limit: 10000
            orderBy: TITLE
            orderByDirection: ASC
          ) {
            id
            path
            title
          }
        }
      `,
      fetchPolicy: 'cache-first'
    })
    state.pages = resp?.data?.pages ?? []
  } catch (err) {
    console.error('Failed to load pages:', err)
  }
  state.loading = false
}

loadPages()
</script>

<style lang="scss">
.page-picker-dialog {
  z-index: 7000 !important;
}
</style>
