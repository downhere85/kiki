<template lang="pug">
q-layout(view='hHh lpR fFf', container)
  q-header.card-header.q-px-md.q-py-sm
    q-icon(name='img:/_assets/icons/color-data-grid.svg', left, size='md')
    span {{t(`editor.tableEditor.title`)}}
    q-space
    .q-gutter-sm.row.items-center
      q-btn(
        flat
        dense
        icon='las la-plus-circle'
        color='white'
        @click='addColumn'
        )
        q-tooltip Add Column
      q-btn(
        flat
        dense
        icon='las la-minus-circle'
        color='white'
        @click='removeColumn'
        :disable='state.cols < 2'
        )
        q-tooltip Remove Column
      q-btn(
        flat
        dense
        icon='las la-plus-square'
        color='white'
        @click='addRow'
        )
        q-tooltip Add Row
      q-btn(
        flat
        dense
        icon='las la-minus-square'
        color='white'
        @click='removeRow'
        :disable='state.rows.length < 2'
        )
        q-tooltip Remove Row
    q-btn-group.q-ml-md(push)
      q-btn(
        push
        color='white'
        text-color='grey-7'
        :label='t(`common.actions.cancel`)'
        icon='las la-times'
        @click='close'
      )
      q-btn(
        push
        color='positive'
        text-color='white'
        :label='t(`common.actions.save`)'
        icon='las la-check'
        @click='save'
      )

  q-page-container
    q-page.q-pa-md
      .text-caption.q-mb-sm Edit your table below. Click cells to modify content.
      table.table-editor-grid
        thead
          tr
            th(
              v-for='(header, ci) of state.headers'
              :key='`h-${ci}`'
              )
              q-input(
                v-model='state.headers[ci]'
                dense
                borderless
                input-class='text-weight-bold text-center'
                :placeholder='`Column ${ci + 1}`'
              )
        tbody
          tr(
            v-for='(row, ri) of state.rows'
            :key='`r-${ri}`'
            )
            td(
              v-for='(cell, ci) of row'
              :key='`c-${ri}-${ci}`'
              )
              q-input(
                v-model='state.rows[ri][ci]'
                dense
                borderless
                :placeholder='`...`'
              )

      .q-mt-md
        .text-caption.text-grey Markdown preview:
        pre.q-pa-sm.bg-grey-2.text-body2.font-robotomono(
          style='border-radius: 4px; overflow-x: auto;'
          ) {{ markdownOutput }}
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { computed, reactive } from 'vue'

import { useSiteStore } from '@/stores/site'

// QUASAR

const $q = useQuasar()

// STORES

const siteStore = useSiteStore()

// I18N

const { t } = useI18n()

// DATA

const state = reactive({
  cols: 3,
  headers: ['Header 1', 'Header 2', 'Header 3'],
  rows: [
    ['', '', ''],
    ['', '', '']
  ]
})

// COMPUTED

const markdownOutput = computed(() => {
  const headers = state.headers.map(h => ` ${h || ' '} `).join('|')
  const separator = state.headers.map(() => '---').join('|')
  const rows = state.rows.map(row =>
    row.map(cell => ` ${cell || ' '} `).join('|')
  ).join('\n')
  return `| ${headers.replace(/ \| /g, ' | ')} |\n| ${separator.replace(/\|/g, ' | ')} |\n${state.rows.map(row => '| ' + row.map(cell => ` ${cell || ' '} `).join('| ') + ' |').join('\n')}`
})

// METHODS

function close () {
  siteStore.$patch({ overlay: '' })
}

function addColumn () {
  state.cols++
  state.headers.push(`Header ${state.cols}`)
  state.rows.forEach(row => row.push(''))
}

function removeColumn () {
  if (state.cols < 2) return
  state.cols--
  state.headers.pop()
  state.rows.forEach(row => row.pop())
}

function addRow () {
  state.rows.push(new Array(state.cols).fill(''))
}

function removeRow () {
  if (state.rows.length < 2) return
  state.rows.pop()
}

function save () {
  const headerLine = '| ' + state.headers.map(h => h || ' ').join(' | ') + ' |'
  const separatorLine = '| ' + state.headers.map(() => '---').join(' | ') + ' |'
  const bodyLines = state.rows.map(row =>
    '| ' + row.map(cell => cell || ' ').join(' | ') + ' |'
  ).join('\n')

  const markdown = `${headerLine}\n${separatorLine}\n${bodyLines}`

  EVENT_BUS.emit('insertContent', { content: markdown })
  close()
}
</script>

<style lang="scss">
.table-editor-grid {
  width: 100%;
  border-collapse: collapse;

  th, td {
    border: 1px solid #ddd;
    padding: 2px 4px;
    min-width: 120px;
  }

  th {
    background: #f5f5f5;
  }

  td {
    background: #fff;
  }
}
</style>
