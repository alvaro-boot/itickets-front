<template>
  <div class="rich-text-editor" :class="{ 'rich-text-editor--compact': compact, 'rich-text-editor--disabled': disabled }">
    <div class="rich-text-editor__toolbar actions-row">
      <button class="btn btn-ghost" type="button" :disabled="disabled" @click="execRich('bold')"><strong>B</strong></button>
      <button class="btn btn-ghost" type="button" :disabled="disabled" @click="execRich('italic')"><em>I</em></button>
      <button class="btn btn-ghost" type="button" :disabled="disabled" @click="execRich('underline')"><u>U</u></button>
      <button class="btn btn-ghost" type="button" :disabled="disabled" @click="execRich('insertUnorderedList')">Lista</button>
      <button class="btn btn-ghost" type="button" title="Código en línea" :disabled="disabled" @click="insertInlineCode">`</button>
      <button
        class="btn btn-ghost"
        type="button"
        title="Bloque de código (SQL, JS, etc.)"
        :disabled="disabled"
        @click="insertCodeBlock"
      >
        &lt;/&gt;
      </button>
      <button class="btn btn-ghost" type="button" :disabled="disabled" @click="insertLink">Link</button>
      <button class="btn btn-ghost" type="button" :disabled="disabled" @click="execRich('removeFormat')">Limpiar</button>
    </div>
    <div
      :id="id || undefined"
      ref="editorRef"
      class="rich-editor"
      :contenteditable="disabled ? 'false' : 'true'"
      :data-placeholder="placeholder"
      @input="onInput"
      @blur="onInput"
    ></div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue';
import { sanitizeRichHtml, toEditableHtml, escapeHtml } from '../utils/richHtml';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  /** Menor altura mínima (p. ej. comentarios). */
  compact: { type: Boolean, default: false },
  id: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const editorRef = ref(null);

function emitValue() {
  emit('update:modelValue', sanitizeRichHtml(editorRef.value?.innerHTML || ''));
}

function onInput() {
  emitValue();
}

function setEditorHtml(html) {
  if (!editorRef.value) return;
  editorRef.value.innerHTML = toEditableHtml(html || '');
}

function execRich(command) {
  if (props.disabled) return;
  editorRef.value?.focus();
  document.execCommand(command, false);
  emitValue();
}

function insertLink() {
  if (props.disabled) return;
  const url = window.prompt('Ingresa la URL (https://...)');
  if (!url) return;
  editorRef.value?.focus();
  document.execCommand('createLink', false, String(url).trim());
  emitValue();
}

function insertInlineCode() {
  if (props.disabled) return;
  editorRef.value?.focus();
  const sel = window.getSelection();
  const text = sel?.rangeCount ? String(sel.getRangeAt(0).toString() || '') : '';
  const chunk = text || 'codigo';
  document.execCommand('insertHTML', false, `<code class="rich-inline-code">${escapeHtml(chunk)}</code>`);
  emitValue();
}

function insertCodeBlock() {
  if (props.disabled) return;
  const suggested = window.prompt(
    'Lenguaje para resaltado (sql, javascript, typescript, json, bash, json, plain):',
    'sql',
  );
  if (suggested === null) return;
  let lang = String(suggested).trim().toLowerCase() || 'plain';
  if (!/^[\w.+-]+$/.test(lang)) lang = 'plain';
  editorRef.value?.focus();
  const html =
    '<pre class="rich-pre"><code class="language-' +
    lang +
    '">\u200b</code></pre><p><br></p>';
  document.execCommand('insertHTML', false, html);
  emitValue();
}

watch(
  () => props.modelValue,
  (v) => {
    const current = sanitizeRichHtml(editorRef.value?.innerHTML || '');
    const next = sanitizeRichHtml(v || '');
    if (current === next) return;
    setEditorHtml(v || '');
  },
);

onMounted(async () => {
  await nextTick();
  setEditorHtml(props.modelValue || '');
});
</script>

<style scoped>
.rich-text-editor__toolbar {
  flex-wrap: wrap;
  margin-bottom: 0.45rem;
}
</style>

<style>
.rich-text-editor--compact .rich-editor {
  min-height: 96px;
}

.rich-text-editor--disabled {
  opacity: 0.65;
  pointer-events: none;
}
</style>
