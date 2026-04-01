<template lang="pug">
q-dialog.page-picker-dialog(ref='dialogRef', @hide='onDialogHide')
  q-card(style='width: 600px; max-width: 90vw;')
    q-card-section.card-header
      q-icon(name='ph ph-magnifying-glass', left, size='sm')
      span Browse Pages
    q-card-section.q-pt-sm.q-pb-none
      q-input(
        v-model='state.filter'
        outlined
        dense
        placeholder='Filter by title or path...'
        autofocus
        clearable
        @update:model-value='onFilter'
      )
        template(#prepend)
          q-icon(name='ph ph-magnifying-glass')
    q-card-section.q-pt-sm(style='height: 400px; overflow: hidden;')
      q-scroll-area(style='height: 100%;')
        q-list(separator)
          q-item(
            v-if='state.loading'
          )
            q-item-section.text-center
              q-spinner(size='sm')
              .text-grey.q-mt-sm Loading pages...
          q-item(
            v-else-if='filteredPages.length === 0'
          )
            q-item-section
              .text-grey No pages found.
          q-item(
            v-for='page of filteredPages'
            :key='page.id'
            clickable
            v-ripple
            @click='selectPage(page)'
            :active='state.selected === page.path'
            active-class='bg-primary text-white'
          )
            q-item-section(avatar)
              q-icon(name='ph ph-file-text', :color='state.selected === page.path ? "white" : "grey-7"')
            q-item-section
              q-item-label {{ page.title || '(Untitled)' }}
              q-item-label(:class='state.selected === page.path ? "text-white-7" : ""', caption) /{{ page.path }}
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
  selected: null
})

const filteredPages = computed(() => {
  if (!state.filter) {
    return state.pages.slice(0, 100)
  }
  const q = state.filter.toLowerCase()
  return state.pages.filter(p =>
    (p.title && p.title.toLowerCase().includes(q)) ||
    (p.path && p.path.toLowerCase().includes(q))
  ).slice(0, 100)
})

function onFilter () {
  state.selected = null
}

function selectPage (page) {
  state.selected = page.path
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
