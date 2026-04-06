<template lang="pug">
q-dialog(ref='dialogRef', @hide='onDialogHide')
  q-card.document-import-dialog
    q-card-section.card-header
      q-icon(name='ph ph-file-arrow-up', left, size='sm')
      span Import Document
    q-card-section
      .text-caption.text-grey-6.q-mb-md Import a document and convert it to Markdown. Images will be uploaded as assets.
      .document-import-drop(
        @dragover.prevent='state.dragOver = true'
        @dragleave='state.dragOver = false'
        @drop.prevent='onDrop'
        :class='{ "document-import-drop--active": state.dragOver }'
        @click='openFilePicker'
        )
        input.hidden(
          ref='fileInput'
          type='file'
          :accept='acceptedTypes'
          @change='onFileSelected'
          )
        template(v-if='!state.file')
          q-icon(name='ph ph-upload-simple', size='40px', color='grey-5')
          .text-body2.q-mt-sm.text-grey-6 Drop a file here or click to browse
          .text-caption.text-grey-5.q-mt-xs DOCX, HTML, or TXT
        template(v-else)
          q-icon(:name='fileIcon', size='40px', color='primary')
          .text-body2.q-mt-sm {{ state.file.name }}
          .text-caption.text-grey-5 {{ fileSize }}
      //- Progress
      template(v-if='state.processing')
        q-linear-progress.q-mt-md(indeterminate, rounded, size='lg')
        .text-caption.text-center.q-mt-xs.text-grey-6 {{ state.statusText }}
      //- Error
      .text-negative.text-caption.q-mt-md(v-if='state.error') {{ state.error }}
    q-card-actions(align='right')
      q-btn(flat, label='Cancel', color='grey-7', @click='onDialogCancel', :disable='state.processing')
      q-btn(
        flat
        label='Import'
        color='primary'
        @click='doImport'
        :disable='!state.file || state.processing'
        :loading='state.processing'
        )
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import gql from 'graphql-tag'
import mammoth from 'mammoth'
import TurndownService from 'turndown'

import { usePageStore } from '@/stores/page'
import { useSiteStore } from '@/stores/site'

// PROPS

const props = defineProps({
  mode: { type: String, default: 'markdown' } // 'markdown' or 'html'
})

// EMITS

const emit = defineEmits([
  ...useDialogPluginComponent.emits
])

// QUASAR

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $q = useQuasar()

// STORES

const pageStore = usePageStore()
const siteStore = useSiteStore()

// STATE

const fileInput = ref(null)
const acceptedTypes = '.docx,.html,.htm,.txt,.text'

const state = reactive({
  file: null,
  dragOver: false,
  processing: false,
  statusText: '',
  error: ''
})

// COMPUTED

const fileIcon = computed(() => {
  if (!state.file) return 'ph ph-file'
  const ext = state.file.name.split('.').pop().toLowerCase()
  if (ext === 'docx') return 'ph ph-microsoft-word-logo'
  if (['html', 'htm'].includes(ext)) return 'ph ph-file-html'
  return 'ph ph-file-text'
})

const fileSize = computed(() => {
  if (!state.file) return ''
  const bytes = state.file.size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
})

// METHODS

function openFilePicker () {
  fileInput.value?.click()
}

function onFileSelected (ev) {
  const file = ev.target.files?.[0]
  if (file) {
    state.file = file
    state.error = ''
  }
}

function onDrop (ev) {
  state.dragOver = false
  const file = ev.dataTransfer?.files?.[0]
  if (file) {
    state.file = file
    state.error = ''
  }
}

async function uploadImage (imageBuffer, contentType) {
  const ext = contentType.split('/')[1] || 'png'
  const fileName = `import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
  const blob = new Blob([imageBuffer], { type: contentType })
  const file = new File([blob], fileName, { type: contentType })

  try {
    const resp = await APOLLO_CLIENT.mutate({
      context: { uploadMode: true },
      mutation: gql`
        mutation uploadAssets (
          $folderPath: String
          $locale: String
          $siteId: UUID
          $files: [Upload!]!
        ) {
          uploadAssets (
            folderPath: $folderPath
            locale: $locale
            siteId: $siteId
            files: $files
          ) {
            operation {
              succeeded
              message
            }
          }
        }
      `,
      variables: {
        folderPath: pageStore.path || null,
        siteId: siteStore.id,
        locale: pageStore.locale || 'en',
        files: [file]
      }
    })
    if (!resp?.data?.uploadAssets?.operation?.succeeded) {
      throw new Error(resp?.data?.uploadAssets?.operation?.message || 'Upload failed')
    }
    // Return the asset path for use in markdown
    const folderPath = pageStore.path || ''
    return folderPath ? `/${folderPath}/${fileName}` : `/${fileName}`
  } catch (err) {
    console.warn('Image upload failed:', err)
    return null
  }
}

async function convertDocx (file) {
  state.statusText = 'Reading DOCX...'
  const arrayBuffer = await file.arrayBuffer()

  const uploadedImages = []
  let imageIndex = 0

  state.statusText = 'Converting to HTML...'
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        imageIndex++
        state.statusText = `Uploading image ${imageIndex}...`
        const imageBuffer = await image.read()
        const assetPath = await uploadImage(imageBuffer, image.contentType)
        if (assetPath) {
          uploadedImages.push(assetPath)
          return { src: assetPath }
        }
        // Fallback: inline base64 if upload fails
        const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))
        return { src: `data:${image.contentType};base64,${base64}` }
      })
    }
  )

  if (props.mode === 'html') {
    return { html: result.value }
  }

  state.statusText = 'Converting to Markdown...'
  const preprocessed = preprocessTables(result.value)
  const td = createTurndownService()
  return { markdown: td.turndown(preprocessed) }
}

async function convertHtml (file) {
  state.statusText = 'Reading HTML...'
  const html = await file.text()

  if (props.mode === 'html') {
    return { html }
  }

  state.statusText = 'Converting to Markdown...'
  const preprocessed = preprocessTables(html)
  const td = createTurndownService()
  return { markdown: td.turndown(preprocessed) }
}

async function convertTxt (file) {
  state.statusText = 'Reading text...'
  const text = await file.text()
  if (props.mode === 'html') {
    // Wrap plain text in paragraphs for WYSIWYG
    const html = text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
    return { html }
  }
  return { markdown: text }
}

function preprocessTables (html) {
  // Parse HTML, find all <table> elements, replace them with markdown tables
  // BEFORE turndown processes anything. This avoids turndown's bottom-up
  // child processing destroying table cell content.
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html')
  const tables = doc.querySelectorAll('table')

  for (const table of tables) {
    const md = htmlToMarkdownTable(table)
    // Create a text node placeholder that turndown will pass through
    // We use a <pre> with a special marker so turndown doesn't process it
    const placeholder = doc.createElement('div')
    placeholder.setAttribute('data-md-table', 'true')
    placeholder.innerHTML = md
    table.replaceWith(placeholder)
  }

  // Serialize back to HTML string, replacing our placeholders with raw markdown
  let result = doc.body.innerHTML
  // Extract markdown from placeholder divs
  result = result.replace(/<div data-md-table="true">([\s\S]*?)<\/div>/g, (match, inner) => {
    // Decode HTML entities back to plain text
    const txt = doc.createElement('textarea')
    txt.innerHTML = inner
    return txt.value
  })
  return result
}

function htmlToMarkdownTable (tableEl) {
  // Extract rows from the table
  const rows = []
  const trElements = tableEl.querySelectorAll('tr')
  let hasComplexCells = false

  for (const tr of trElements) {
    const cells = []
    for (const cell of tr.children) {
      if (cell.tagName !== 'TD' && cell.tagName !== 'TH') continue
      // Check for colspan/rowspan (complex tables)
      const colspan = parseInt(cell.getAttribute('colspan') || '1', 10)
      const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10)
      if (colspan > 1 || rowspan > 1) {
        hasComplexCells = true
      }
      // Get cell text, collapse whitespace, handle inline formatting
      let text = cell.innerHTML
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<strong>/gi, '**').replace(/<\/strong>/gi, '**')
        .replace(/<em>/gi, '*').replace(/<\/em>/gi, '*')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      // Escape pipes in content
      text = text.replace(/\|/g, '\\|')
      cells.push(text)
    }
    if (cells.length > 0) rows.push(cells)
  }

  if (rows.length < 1) return ''

  // For complex tables with colspan/rowspan, fall back to HTML
  if (hasComplexCells) {
    return `\n\n${tableEl.outerHTML}\n\n`
  }

  // Normalize column count (pad short rows)
  const maxCols = Math.max(...rows.map(r => r.length))
  for (const row of rows) {
    while (row.length < maxCols) row.push('')
  }

  // Build markdown table
  const lines = []
  // Header row (first row)
  lines.push('| ' + rows[0].join(' | ') + ' |')
  // Separator
  lines.push('| ' + rows[0].map(() => '---').join(' | ') + ' |')
  // Data rows
  for (let i = 1; i < rows.length; i++) {
    lines.push('| ' + rows[i].join(' | ') + ' |')
  }
  return '\n\n' + lines.join('\n') + '\n\n'
}

function createTurndownService () {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*'
  })
  // Tables are pre-processed before turndown (see preprocessTables).
  // No table rules needed here.
  return td
}

async function doImport () {
  if (!state.file) return

  state.processing = true
  state.error = ''

  try {
    const ext = state.file.name.split('.').pop().toLowerCase()
    let result = {}

    if (ext === 'docx') {
      result = await convertDocx(state.file)
    } else if (['html', 'htm'].includes(ext)) {
      result = await convertHtml(state.file)
    } else if (['txt', 'text'].includes(ext)) {
      result = await convertTxt(state.file)
    } else {
      throw new Error(`Unsupported file type: .${ext}`)
    }

    onDialogOK(result)
  } catch (err) {
    state.error = err.message || 'Import failed'
  } finally {
    state.processing = false
  }
}
</script>

<style lang="scss">
.document-import-dialog {
  min-width: 420px;
  max-width: 520px;
}

.document-import-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  border: 2px dashed rgba(255,255,255,.15);
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s ease;

  @at-root .body--light & {
    border-color: $grey-4;
  }

  &:hover, &--active {
    border-color: var(--q-primary);
    background-color: rgba(255,255,255,.03);

    @at-root .body--light & {
      background-color: rgba(0,0,0,.02);
    }
  }
}
</style>
