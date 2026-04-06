<template lang="pug">
.page-comments.q-mt-lg
  q-separator.q-mb-md
  .flex.items-center.q-mb-md
    q-icon.q-mr-sm(name='ph ph-chat-circle-dots', size='sm', color='grey')
    .text-subtitle2.text-grey-7 Comments
    q-space
    q-btn(
      v-if='!state.showForm'
      flat
      dense
      no-caps
      color='primary'
      label='Add Comment'
      icon='ph ph-plus'
      @click='state.showForm = true'
      )

  //- Comment Form
  template(v-if='state.showForm')
    q-card.q-mb-md(flat, bordered)
      q-card-section
        q-input(
          v-model='state.newComment'
          type='textarea'
          outlined
          autogrow
          placeholder='Write a comment... (Markdown supported)'
          :min-rows='3'
          )
      q-card-actions(align='right')
        q-btn(
          flat
          no-caps
          label='Cancel'
          @click='cancelComment'
          )
        q-btn(
          unelevated
          no-caps
          color='primary'
          label='Post Comment'
          icon='ph ph-paper-plane-tilt'
          :loading='state.posting'
          :disable='!state.newComment.trim()'
          @click='postComment'
          )

  //- Comments List
  template(v-if='state.comments.length > 0')
    q-card.q-mb-sm(
      v-for='comment of state.comments'
      :key='comment.id'
      flat
      bordered
      )
      q-card-section
        .row.items-center.q-mb-sm
          q-avatar(size='sm', color='primary', text-color='white')
            span {{ getInitial(comment.authorName) }}
          .q-ml-sm
            .text-body2.text-weight-medium {{ comment.authorName || 'Anonymous' }}
            .text-caption.text-grey {{ formatDate(comment.createdAt) }}
        div(v-html='comment.render || comment.content')

  //- No Comments
  .text-grey.text-center.q-pa-md(v-else-if='state.loading < 1')
    | No comments yet. Be the first to comment!

  q-inner-loading(:showing='state.loading > 0')
</template>

<script setup>
import gql from 'graphql-tag'
import { useQuasar } from 'quasar'
import { onMounted, reactive } from 'vue'
import { DateTime } from 'luxon'

import { usePageStore } from '@/stores/page'

// QUASAR

const $q = useQuasar()

// STORES

const pageStore = usePageStore()

// DATA

const state = reactive({
  comments: [],
  showForm: false,
  newComment: '',
  posting: false,
  loading: 0
})

// METHODS

function formatDate (dateStr) {
  if (!dateStr) return ''
  return DateTime.fromISO(dateStr).toRelative()
}

function getInitial (name) {
  return (name || '?').charAt(0).toUpperCase()
}

function cancelComment () {
  state.newComment = ''
  state.showForm = false
}

async function fetchComments () {
  state.loading++
  try {
    const resp = await APOLLO_CLIENT.query({
      query: gql`
        query getPageComments ($locale: String!, $path: String!) {
          comments(locale: $locale, path: $path) {
            id
            content
            render
            authorName
            createdAt
            updatedAt
          }
        }
      `,
      variables: {
        locale: pageStore.locale,
        path: pageStore.path
      },
      fetchPolicy: 'network-only'
    })
    state.comments = resp.data?.comments ?? []
  } catch (err) {
    console.warn('Failed to load comments:', err.message)
  }
  state.loading--
}

async function postComment () {
  if (!state.newComment.trim()) return
  state.posting = true
  try {
    await APOLLO_CLIENT.mutate({
      mutation: gql`
        mutation postComment ($pageId: UUID!, $content: String!) {
          createComment(pageId: $pageId, content: $content) {
            operation {
              succeeded
              message
            }
            id
          }
        }
      `,
      variables: {
        pageId: pageStore.id,
        content: state.newComment
      }
    })
    state.newComment = ''
    state.showForm = false
    $q.notify({ type: 'positive', message: 'Comment posted.' })
    await fetchComments()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to post comment.',
      caption: err.message
    })
  }
  state.posting = false
}

// MOUNTED

onMounted(() => {
  fetchComments()
})
</script>
