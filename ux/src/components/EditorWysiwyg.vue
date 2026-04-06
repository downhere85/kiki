<template lang="pug">
.wysiwyg-container
  .wysiwyg-toolbar(v-if='editor')
    template(v-for='menuItem of menuBar')
      q-separator.q-mx-xs(
        v-if='menuItem.type === `divider`'
        vertical
        )
      q-btn(
        v-else-if='menuItem.type === `dropdown`'
        :key='`ddn-` + menuItem.key'
        flat
        :icon='menuItem.icon'
        padding='xs'
        :class='{ "is-active": menuItem.isActive && menuItem.isActive() }'
        :color='menuItem.isActive && menuItem.isActive() ? `primary` : `grey-10`'
        :aria-label='menuItem.title'
        split
        :disabled='menuItem.disabled && menuItem.disabled()'
        )
        q-menu
          q-list(
            dense
            padding
            )
            template(v-for='child of menuItem.children')
              q-separator.q-my-sm(v-if='child.type === `divider`')
              q-item(
                v-else
                :key='child.key'
                clickable
                @click='child.action'
                :active='child.isActive && child.isActive()'
                active-class='text-primary'
                :disabled='child.disabled && child.disabled()'
                )
                q-item-section(side)
                  q-icon(
                    :name='child.icon'
                    :color='child.color'
                  )
                q-item-section
                  q-item-label {{child.title}}
      q-btn-group(
        v-else-if='menuItem.type === `btngroup`'
        :key='`btngrp-` + menuItem.key'
        flat
        )
        q-btn(
          v-for='child of menuItem.children'
          :key='child.key'
          flat
          :icon='child.icon'
          padding='xs'
          :class='{ "is-active": child.isActive && child.isActive() }'
          :color='child.isActive && child.isActive() ? `primary` : `grey-10`'
          @click='child.action'
          :aria-label='child.title'
          :disabled='menuItem.disabled && menuItem.disabled()'
          )
      q-btn(
        v-else
        :key='`btn-` + menuItem.key'
        flat
        :icon='menuItem.icon'
        padding='xs'
        :class='{ "is-active": menuItem.isActive && menuItem.isActive() }'
        :color='menuItem.isActive && menuItem.isActive() ? `primary` : `grey-10`'
        @click='menuItem.action'
        :aria-label='menuItem.title'
        :disabled='menuItem.disabled && menuItem.disabled()'
        )
    //- q-space
    //- q-btn(
    //-   size='sm'
    //-   unelevated
    //-   color='red'
    //-   label='Test'
    //-   @click='snapshot'
    //- )
  //- q-scroll-area(
  //-   :thumb-style='thumbStyle'
  //-   :bar-style='barStyle'
  //-   style='height: 100%;'
  //-   )
  editor-content.page-contents(:editor='editor')
</template>

<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
// import Collaboration from '@tiptap/extension-collaboration'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Typography from '@tiptap/extension-typography'
import { common, createLowlight } from 'lowlight'
import { defineAsyncComponent, onBeforeUnmount, onMounted, reactive, shallowRef } from 'vue'
// import * as Y from 'yjs'
// import { IndexeddbPersistence } from 'y-indexeddb'
// import { WebsocketProvider } from 'y-websocket'

import { useMeta, useQuasar, setCssVar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { DateTime } from 'luxon'

import { useEditorStore } from '@/stores/editor'

const DocumentImportDialog = defineAsyncComponent(() => import('@/components/DocumentImportDialog.vue'))
import { usePageStore } from '@/stores/page'
import { useSiteStore } from '@/stores/site'

const lowlight = createLowlight(common)

// QUASAR

const $q = useQuasar()

// STORES

const editorStore = useEditorStore()
const pageStore = usePageStore()
const siteStore = useSiteStore()

// I18N

const { t } = useI18n()

// STATE

const state = reactive({
  // editor: null,
  ydoc: null
})

let editor = null

const thumbStyle = {
  right: '2px',
  borderRadius: '5px',
  backgroundColor: '#000',
  width: '5px',
  opacity: 0.15
}
const barStyle = {
  backgroundColor: '#FAFAFA',
  width: '9px',
  opacity: 1
}
const menuBar = [
  {
    key: 'bold',
    icon: 'mdi-format-bold',
    title: 'Bold',
    action: () => editor.value.chain().focus().toggleBold().run(),
    isActive: () => editor.value.isActive('bold')
  },
  {
    key: 'italic',
    icon: 'mdi-format-italic',
    title: 'Italic',
    action: () => editor.value.chain().focus().toggleItalic().run(),
    isActive: () => editor.value.isActive('italic')
  },
  {
    key: 'strikethrough',
    icon: 'mdi-format-strikethrough',
    title: 'Strike',
    action: () => editor.value.chain().focus().toggleStrike().run(),
    isActive: () => editor.value.isActive('strike')
  },
  {
    key: 'underline',
    icon: 'mdi-format-underline',
    title: 'Underline',
    action: () => editor.value.chain().focus().toggleUnderline().run(),
    isActive: () => editor.value.isActive('underline')
  },
  {
    key: 'code',
    icon: 'mdi-code-tags',
    title: 'Code',
    action: () => editor.value.chain().focus().toggleCode().run(),
    isActive: () => editor.value.isActive('code')
  },
  {
    key: 'fontfamily',
    icon: 'mdi-format-font',
    title: 'Font Family',
    type: 'dropdown',
    isActive: () => editor.value.isActive('fontFamily'),
    children: [
      {
        key: 'fontunset',
        icon: 'mdi-format-font',
        title: 'Sans-Serif',
        action: () => editor.value.chain().focus().unsetFontFamily().run()
      },
      {
        key: 'monospace',
        icon: 'mdi-format-font',
        title: 'Monospace',
        action: () => editor.value.chain().focus().setFontFamily('monospace').run()
      }
    ]
  },
  {
    key: 'color',
    icon: 'mdi-palette',
    title: 'Text Color',
    type: 'dropdown',
    isActive: () => editor.value.isActive('textStyle'),
    children: [
      {
        key: 'color-blue',
        icon: 'mdi-circle',
        title: 'Blue',
        color: 'blue',
        action: () => editor.value.chain().focus().setColor('#1976D2').run()
      },
      {
        key: 'color-brown',
        icon: 'mdi-circle',
        title: 'Brown',
        color: 'brown',
        action: () => editor.value.chain().focus().setColor('#795548').run()
      },
      {
        key: 'color-green',
        icon: 'mdi-circle',
        title: 'Green',
        color: 'green',
        action: () => editor.value.chain().focus().setColor('#4CAF50').run()
      },
      {
        key: 'color-orange',
        icon: 'mdi-circle',
        title: 'Orange',
        color: 'orange',
        action: () => editor.value.chain().focus().setColor('#FF9800').run()
      },
      {
        key: 'color-pink',
        icon: 'mdi-circle',
        title: 'Pink',
        color: 'pink',
        action: () => editor.value.chain().focus().setColor('#E91E63').run()
      },
      {
        key: 'color-purple',
        icon: 'mdi-circle',
        title: 'Purple',
        color: 'purple',
        action: () => editor.value.chain().focus().setColor('#9C27B0').run()
      },
      {
        key: 'color-red',
        icon: 'mdi-circle',
        title: 'Red',
        color: 'red',
        action: () => editor.value.chain().focus().setColor('#F44336').run()
      },
      {
        key: 'color-teal',
        icon: 'mdi-circle',
        title: 'Teal',
        color: 'teal',
        action: () => editor.value.chain().focus().setColor('#009688').run()
      },
      {
        key: 'color-yellow',
        icon: 'mdi-circle',
        title: 'Yellow',
        color: 'yellow',
        action: () => editor.value.chain().focus().setColor('#FFC107').run()
      },
      {
        type: 'divider'
      },
      {
        key: 'color-remove',
        icon: 'mdi-circle-off-outline',
        title: 'Default',
        color: 'grey',
        action: () => editor.value.chain().focus().unsetColor().run()
      }
    ]
  },
  {
    key: 'highlight',
    icon: 'mdi-marker',
    title: 'Highlight',
    type: 'dropdown',
    isActive: () => editor.value.isActive('highlight'),
    children: [
      {
        key: 'highlight-yellow',
        icon: 'mdi-marker',
        title: 'Yellow',
        color: 'yellow',
        action: () => editor.value.chain().focus().toggleHighlight({ color: '#FFF9C4' }).run()
      },
      {
        key: 'highlight-blue',
        icon: 'mdi-marker',
        title: 'Blue',
        color: 'blue',
        action: () => editor.value.chain().focus().toggleHighlight({ color: '#BBDEFB' }).run()
      },
      {
        key: 'highlight-pink',
        icon: 'mdi-marker',
        title: 'Pink',
        color: 'pink',
        action: () => editor.value.chain().focus().toggleHighlight({ color: '#F8BBD0' }).run()
      },
      {
        key: 'highlight-green',
        icon: 'mdi-marker',
        title: 'Green',
        color: 'green',
        action: () => editor.value.chain().focus().toggleHighlight({ color: '#C8E6C9' }).run()
      },
      {
        key: 'highlight-orange',
        icon: 'mdi-marker',
        title: 'Orange',
        color: 'orange',
        action: () => editor.value.chain().focus().toggleHighlight({ color: '#FFE0B2' }).run()
      },
      {
        type: 'divider'
      },
      {
        key: 'highlight-remove',
        icon: 'mdi-marker-cancel',
        title: 'Remove',
        color: 'grey',
        action: () => editor.value.chain().focus().unsetHighlight().run()
      }
    ]
  },
  {
    type: 'divider'
  },
  {
    key: 'header',
    icon: 'mdi-format-header-pound',
    title: 'Header',
    type: 'dropdown',
    isActive: () => editor.value.isActive('heading'),
    children: [
      {
        key: 'h1',
        icon: 'mdi-format-header-1',
        title: 'Header 1',
        action: () => editor.value.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: () => editor.value.isActive('heading', { level: 1 })
      },
      {
        key: 'h2',
        icon: 'mdi-format-header-2',
        title: 'Header 2',
        action: () => editor.value.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: () => editor.value.isActive('heading', { level: 2 })
      },
      {
        key: 'h3',
        icon: 'mdi-format-header-3',
        title: 'Header 3',
        action: () => editor.value.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: () => editor.value.isActive('heading', { level: 3 })
      },
      {
        key: 'h4',
        icon: 'mdi-format-header-4',
        title: 'Header 4',
        action: () => editor.value.chain().focus().toggleHeading({ level: 4 }).run(),
        isActive: () => editor.value.isActive('heading', { level: 4 })
      },
      {
        key: 'h5',
        icon: 'mdi-format-header-5',
        title: 'Header 5',
        action: () => editor.value.chain().focus().toggleHeading({ level: 5 }).run(),
        isActive: () => editor.value.isActive('heading', { level: 5 })
      },
      {
        key: 'h6',
        icon: 'mdi-format-header-6',
        title: 'Header 6',
        action: () => editor.value.chain().focus().toggleHeading({ level: 6 }).run(),
        isActive: () => editor.value.isActive('heading', { level: 6 })
      }
    ]
  },
  {
    key: 'paragraph',
    icon: 'mdi-format-paragraph',
    title: 'Paragraph',
    action: () => editor.value.chain().focus().setParagraph().run(),
    isActive: () => editor.value.isActive('paragraph')
  },
  {
    type: 'divider'
  },
  {
    key: 'align',
    type: 'btngroup',
    children: [
      {
        key: 'align-left',
        icon: 'mdi-format-align-left',
        title: 'Left Align',
        action: () => editor.value.chain().focus().setTextAlign('left').run(),
        isActive: () => editor.value.isActive({ textAlign: 'left' })
      },
      {
        key: 'align-center',
        icon: 'mdi-format-align-center',
        title: 'Center Align',
        action: () => editor.value.chain().focus().setTextAlign('center').run(),
        isActive: () => editor.value.isActive({ textAlign: 'center' })
      },
      {
        key: 'align-right',
        icon: 'mdi-format-align-right',
        title: 'Right Align',
        action: () => editor.value.chain().focus().setTextAlign('right').run(),
        isActive: () => editor.value.isActive({ textAlign: 'right' })
      },
      {
        key: 'align-justify',
        icon: 'mdi-format-align-justify',
        title: 'Justify Align',
        action: () => editor.value.chain().focus().setTextAlign('justify').run(),
        isActive: () => editor.value.isActive({ textAlign: 'justify' })
      }
    ]
  },
  {
    type: 'divider'
  },
  {
    key: 'bulletlist',
    icon: 'mdi-format-list-bulleted',
    title: 'Bullet List',
    action: () => editor.value.chain().focus().toggleBulletList().run(),
    isActive: () => editor.value.isActive('bulletList')
  },
  {
    key: 'orderedlist',
    icon: 'mdi-format-list-numbered',
    title: 'Ordered List',
    action: () => editor.value.chain().focus().toggleOrderedList().run(),
    isActive: () => editor.value.isActive('orderedList')
  },
  {
    key: 'tasklist',
    icon: 'mdi-format-list-checks',
    title: 'Task List',
    action: () => editor.value.chain().focus().toggleTaskList().run(),
    isActive: () => editor.value.isActive('taskList')
  },
  {
    type: 'divider'
  },
  {
    key: 'codeblock',
    icon: 'mdi-code-json',
    title: 'Code Block',
    action: () => editor.value.chain().focus().toggleCodeBlock().run(),
    isActive: () => editor.value.isActive('codeBlock')
  },
  {
    key: 'blockquote',
    icon: 'mdi-format-quote-open',
    title: 'Blockquote',
    action: () => editor.value.chain().focus().toggleBlockquote().run(),
    isActive: () => editor.value.isActive('blockquote')
  },
  {
    key: 'rule',
    icon: 'mdi-minus',
    title: 'Horizontal Rule',
    action: () => editor.value.chain().focus().setHorizontalRule().run()
  },
  {
    key: 'link',
    icon: 'mdi-link-variant',
    title: 'Link',
    action: () => {
      insertLink()
    }
  },
  {
    key: 'image',
    icon: 'mdi-image-plus',
    title: 'Image',
    action: () => {
      siteStore.openFileManager({ insertMode: true })
    }
  },
  {
    key: 'table',
    icon: 'mdi-table',
    title: 'Table',
    type: 'dropdown',
    isActive: () => editor.value.isActive('table'),
    children: [
      {
        key: 'table-insert',
        icon: 'mdi-table-large-plus',
        title: 'Insert Table',
        action: () => editor.value.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      },
      {
        type: 'divider'
      },
      {
        key: 'table-addcolumnbefore',
        icon: 'mdi-table-column-plus-before',
        title: 'Add Column Before',
        action: () => editor.value.chain().focus().addColumnBefore().run(),
        disabled: () => !editor.value.can().addColumnBefore()
      },
      {
        key: 'table-addcolumnafter',
        icon: 'mdi-table-column-plus-after',
        title: 'Add Column After',
        action: () => editor.value.chain().focus().addColumnAfter().run(),
        disabled: () => !editor.value.can().addColumnAfter()
      },
      {
        key: 'table-deletecolumn',
        icon: 'mdi-table-column-remove',
        title: 'Remove Column',
        action: () => editor.value.chain().focus().deleteColumn().run(),
        disabled: () => !editor.value.can().deleteColumn()
      },
      {
        type: 'divider'
      },
      {
        key: 'table-addrowbefore',
        icon: 'mdi-table-row-plus-before',
        title: 'Add Row Before',
        action: () => editor.value.chain().focus().addRowBefore().run(),
        disabled: () => !editor.value.can().addRowBefore()
      },
      {
        key: 'table-addrowafter',
        icon: 'mdi-table-row-plus-after',
        title: 'Add Row After',
        action: () => editor.value.chain().focus().addRowAfter().run(),
        disabled: () => !editor.value.can().addRowAfter()
      },
      {
        key: 'table-deleterow',
        icon: 'mdi-table-row-remove',
        title: 'Remove Row',
        action: () => editor.value.chain().focus().deleteRow().run(),
        disabled: () => !editor.value.can().deleteRow()
      },
      {
        type: 'divider'
      },
      {
        key: 'table-merge',
        icon: 'mdi-table-merge-cells',
        title: 'Merge Cells',
        action: () => editor.value.chain().focus().mergeCells().run(),
        disabled: () => !editor.value.can().mergeCells()
      },
      {
        key: 'table-split',
        icon: 'mdi-table-split-cell',
        title: 'Split Cell',
        action: () => editor.value.chain().focus().splitCell().run(),
        disabled: () => !editor.value.can().splitCell()
      },
      {
        type: 'divider'
      },
      {
        key: 'table-toggleHeaderColumn',
        icon: 'mdi-table-column',
        title: 'Toggle Header Column',
        action: () => editor.value.chain().focus().toggleHeaderColumn().run(),
        disabled: () => !editor.value.can().toggleHeaderColumn()
      },
      {
        key: 'table-toggleHeaderRow',
        icon: 'mdi-table-row',
        title: 'Toggle Header Row',
        action: () => editor.value.chain().focus().toggleHeaderRow().run(),
        disabled: () => !editor.value.can().toggleHeaderRow()
      },
      {
        key: 'table-toggleHeaderCell',
        icon: 'mdi-crop-square',
        title: 'Toggle Header Cell',
        action: () => editor.value.chain().focus().toggleHeaderCell().run(),
        disabled: () => !editor.value.can().toggleHeaderCell()
      },
      {
        type: 'divider'
      },
      {
        key: 'table-fix',
        icon: 'mdi-table-heart',
        title: 'Fix Table',
        action: () => editor.value.chain().focus().fixTables().run(),
        disabled: () => !editor.value.can().fixTables()
      },
      {
        key: 'table-remove',
        icon: 'mdi-table-large-remove',
        title: 'Delete Table',
        action: () => editor.value.chain().focus().deleteTable().run(),
        disabled: () => !editor.value.can().deleteTable()
      }
    ]
  },
  {
    type: 'divider'
  },
  {
    key: 'pagebreak',
    icon: 'mdi-format-page-break',
    title: 'Hard Break',
    action: () => editor.value.chain().focus().setHardBreak().run()
  },
  {
    key: 'clearformat',
    icon: 'mdi-format-clear',
    title: 'Clear Format',
    action: () => editor.value.chain()
      .focus()
      .clearNodes()
      .unsetAllMarks()
      .run()
  },
  {
    type: 'divider'
  },
  {
    key: 'undo',
    icon: 'mdi-undo-variant',
    title: 'Undo',
    action: () => editor.value.chain().focus().undo().run(),
    disabled: () => !editor.value.can().undo()
  },
  {
    key: 'redo',
    icon: 'mdi-redo-variant',
    title: 'Redo',
    action: () => editor.value.chain().focus().redo().run(),
    disabled: () => !editor.value.can().redo()
  },
  { type: 'divider' },
  {
    key: 'import',
    icon: 'ph ph-file-arrow-up',
    title: 'Import Document (DOCX, HTML, TXT)',
    action: () => importDocument()
  }
]

// METHODS

function importDocument () {
  $q.dialog({
    component: DocumentImportDialog,
    componentProps: { mode: 'html' }
  }).onOk(({ html, markdown }) => {
    const content = html || markdown
    if (!content || !editor.value) return
    // Replace entire editor content with imported HTML
    editor.value.commands.setContent(content)
    // Explicitly sync to page store in case onUpdate doesn't fire
    const outputHtml = editor.value.getHTML()
    pageStore.$patch({
      content: outputHtml,
      render: outputHtml
    })
    // Ensure save button is enabled (hasPendingChanges requires both timestamps to differ)
    const now = DateTime.utc()
    editorStore.$patch({
      lastChangeTimestamp: now,
      lastSaveTimestamp: editorStore.lastSaveTimestamp || now.minus({ seconds: 1 })
    })
    $q.notify({ type: 'positive', message: 'Document imported successfully' })
  })
}

function init () {
  // -> Setup Editor View
  editorStore.$patch({
    hideSideNav: false
  })

  // -> Init Live Collab
  // this.ydoc = new Y.Doc()

  /* eslint-disable no-unused-vars */
  // const dbProvider = new IndexeddbPersistence('example-document', this.ydoc)
  // const wsProvider = new WebsocketProvider('ws://127.0.0.1:1234', 'example-document', this.ydoc)
  /* eslint-enable no-unused-vars */

  // -> Initialize TipTap
  editor = useEditor({
    content: parseEditorContent(pageStore.content),
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        history: {
          depth: 500
        }
      }),
      CodeBlockLowlight.configure({
        lowlight
      }),
      Color,
      // Collaboration.configure({
      //   document: this.ydoc
      // }),
      FontFamily,
      Highlight.configure({
        multicolor: true
      }),
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow'
        }
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Enter some content here...'
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem,
      TextAlign,
      TextStyle,
      Typography
    ],
    onUpdate: ({ editor }) => {
      editorStore.$patch({
        lastChangeTimestamp: DateTime.utc()
      })
      const html = editor.getHTML()
      pageStore.$patch({
        content: html,
        render: html
      })
    }
  })
}

/**
 * Parse content for the editor.
 * Handles both legacy Tiptap JSON format and new HTML format.
 */
function parseEditorContent (content) {
  if (!content) return '<p></p>'
  // Legacy: content stored as Tiptap JSON document
  if (content.startsWith('{') || content.startsWith('[')) {
    try {
      return JSON.parse(content)
    } catch {
      // Not valid JSON, treat as HTML
    }
  }
  // New format: content is HTML
  if (content.startsWith('<')) return content
  // Fallback: wrap plain text in paragraph
  return `<p>${content}</p>`
}

function insertLink () {
  // Get existing link if cursor is on one
  const previousUrl = editor.value.getAttributes('link').href || ''

  $q.dialog({
    title: 'Insert Link',
    prompt: {
      model: previousUrl,
      type: 'url',
      label: 'URL',
      outlined: true
    },
    cancel: true
  }).onOk(url => {
    if (!url) {
      // Remove link
      editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  })
}

function insertTable () {
  editor.value.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

onBeforeUnmount(() => {
  editor.value.destroy()
})

init()
</script>

<style lang="scss">
.wysiwyg-container {
  height: calc(100% - 41px);

  .wysiwyg-toolbar {
    border: none;
    border-bottom: 1px solid $grey-4;
    display: flex;
    align-items: center;
    padding: 4px;
    background: linear-gradient(to top, $grey-1 0%, #FFF 100%);
  }

  // The editor-content element has .page-contents class applied,
  // so it inherits the same styles as rendered pages (from _page-contents.scss
  // and notebook.scss). Only editor-specific overrides are defined here.
  .ProseMirror {
    padding: 20px 28px;
    min-height: 75vh;

    &-focused {
      border: none;
      outline: none;
    }

    // Editor-specific: table cell selection
    table {
      .selectedCell:after {
        z-index: 2;
        position: absolute;
        content: "";
        left: 0; right: 0; top: 0; bottom: 0;
        background: rgba(200, 200, 255, 0.4);
        pointer-events: none;
      }

      .column-resize-handle {
        position: absolute;
        right: -2px;
        top: 0;
        bottom: -2px;
        width: 4px;
        background-color: #adf;
        pointer-events: none;
      }

      td, th {
        position: relative;
      }
    }

    .tableWrapper {
      overflow-x: auto;
    }

    .resize-cursor {
      cursor: ew-resize;
      cursor: col-resize;
    }

    // Editor-specific: task list checkboxes
    ul[data-type="taskList"] {
      list-style: none;
      padding: 0;

      li {
        display: flex;
        align-items: center;

        > label {
          flex: 0 0 auto;
          margin-right: 0.5rem;
        }
      }
    }

    // Editor-specific: placeholder text
    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: #ced4da;
      pointer-events: none;
      height: 0;
    }
  }
}
</style>
