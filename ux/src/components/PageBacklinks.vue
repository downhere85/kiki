<template lang="pug">
.page-backlinks(v-if='state.backlinks.length > 0')
  .q-pa-md
    .flex.items-center
      q-icon.q-mr-sm(name='ph ph-arrow-bend-up-left', color='grey')
      .text-caption.text-grey-7 Backlinks
      q-badge.q-ml-sm(:label='state.backlinks.length', color='grey-7', outline)
    q-list.q-mt-sm(dense)
      q-item.page-backlinks-item(
        v-for='link of state.backlinks'
        :key='link.id'
        clickable
        dense
        :to='`/${link.path}`'
        )
        q-item-section(side)
          q-icon(name='ph ph-file-text', size='xs', color='grey')
        q-item-section
          q-item-label.text-caption(lines='1') {{ link.title }}
          q-item-label.text-caption(caption, lines='1') /{{ link.path }}
</template>

<script setup>
import { reactive, watch } from 'vue'
import gql from 'graphql-tag'

import { usePageStore } from '@/stores/page'

const pageStore = usePageStore()

const state = reactive({
  backlinks: []
})

async function fetchBacklinks () {
  if (!pageStore.path || !pageStore.locale) {
    state.backlinks = []
    return
  }
  try {
    const resp = await APOLLO_CLIENT.query({
      query: gql`
        query pageBacklinks ($path: String!, $locale: String!) {
          pageBacklinks(path: $path, locale: $locale) {
            id
            path
            title
            locale
          }
        }
      `,
      variables: {
        path: pageStore.path,
        locale: pageStore.locale
      },
      fetchPolicy: 'network-only'
    })
    state.backlinks = resp.data?.pageBacklinks ?? []
  } catch {
    state.backlinks = []
  }
}

watch(() => pageStore.path, fetchBacklinks, { immediate: true })
</script>

<style lang="scss">
.page-backlinks {
  border-top: 1px solid rgba(255,255,255,.08);

  @at-root .body--light & {
    border-top-color: $grey-3;
  }

  &-item {
    padding: 2px 0;
    min-height: 28px;
    border-radius: 4px;

    &:hover {
      background-color: rgba(0,0,0,.03);
    }
  }
}
</style>
