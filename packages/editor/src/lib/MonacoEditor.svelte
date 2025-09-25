<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { initializeMonaco, defaultMonacoConfig, createMonacoModel, setupSvelteSnippets } from './monaco.js';
  
  // Props
  export let value = '';
  export let language = 'javascript';
  export let theme = 'constructor-dark';
  export let filename = 'untitled.js';
  export let options = {};
  export let readonly = false;
  export let width = '100%';
  export let height = '400px';

  // Variables internes
  let container;
  let editor;
  let model;
  let isInitialized = false;
  
  const dispatch = createEventDispatcher();

  // Configuration combinée
  $: config = {
    ...defaultMonacoConfig,
    theme,
    readOnly: readonly,
    ...options
  };

  onMount(async () => {
    if (typeof window === 'undefined') return;
    
    try {
      // Initialiser Monaco si pas déjà fait
      if (!window.monaco) {
        await initializeMonaco();
        setupSvelteSnippets();
      }

      // Créer l'éditeur
      editor = window.monaco.editor.create(container, {
        ...config,
        value: '',
        language
      });

      // Créer et assigner le modèle
      model = createMonacoModel(value, filename);
      editor.setModel(model);

      // Écouter les changements
      model.onDidChangeContent((e) => {
        const newValue = model.getValue();
        if (newValue !== value) {
          value = newValue;
          dispatch('change', { value: newValue, event: e });
        }
      });

      // Écouter les changements de curseur
      editor.onDidChangeCursorPosition((e) => {
        dispatch('cursorChange', { position: e.position });
      });

      // Écouter les changements de sélection
      editor.onDidChangeCursorSelection((e) => {
        dispatch('selectionChange', { selection: e.selection });
      });

      // Écouter le focus/blur
      editor.onDidFocusEditorText(() => {
        dispatch('focus');
      });

      editor.onDidBlurEditorText(() => {
        dispatch('blur');
      });

      isInitialized = true;
      dispatch('ready', { editor, model });

    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Monaco:', error);
      dispatch('error', { error });
    }
  });

  onDestroy(() => {
    if (model) {
      model.dispose();
    }
    if (editor) {
      editor.dispose();
    }
  });

  // Méthodes publiques
  export function getEditor() {
    return editor;
  }

  export function getModel() {
    return model;
  }

  export function getValue() {
    return model ? model.getValue() : value;
  }

  export function setValue(newValue, source = 'external') {
    if (!model) return;
    
    if (source === 'external') {
      // Changement externe, mettre à jour le modèle
      model.setValue(newValue);
    }
    value = newValue;
  }

  export function insertText(text, position = null) {
    if (!editor) return;
    
    const pos = position || editor.getPosition();
    editor.executeEdits('insert', [{
      range: {
        startLineNumber: pos.lineNumber,
        startColumn: pos.column,
        endLineNumber: pos.lineNumber,
        endColumn: pos.column
      },
      text,
      forceMoveMarkers: true
    }]);
  }

  export function formatDocument() {
    if (!editor) return;
    editor.getAction('editor.action.formatDocument').run();
  }

  export function focus() {
    if (editor) {
      editor.focus();
    }
  }

  export function setTheme(newTheme) {
    if (window.monaco) {
      window.monaco.editor.setTheme(newTheme);
      theme = newTheme;
    }
  }

  export function resize() {
    if (editor) {
      editor.layout();
    }
  }

  // Réactifs
  $: if (isInitialized && editor && config.theme !== theme) {
    setTheme(config.theme);
  }

  $: if (isInitialized && model && filename) {
    // Changer le langage si le nom de fichier change
    const newLanguage = detectLanguageFromFilename(filename);
    if (newLanguage !== model.getLanguageId()) {
      window.monaco.editor.setModelLanguage(model, newLanguage);
    }
  }

  function detectLanguageFromFilename(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'svelte': 'svelte',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml'
    };
    return languageMap[ext] || 'javascript';
  }
</script>

<div 
  bind:this={container}
  class="monaco-editor-container"
  style="width: {width}; height: {height};"
/>

<style>
  .monaco-editor-container {
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    overflow: hidden;
  }

  :global(.monaco-editor .remote-cursor) {
    border-left: 2px solid;
    position: relative;
  }

  :global(.monaco-editor .remote-cursor-label) {
    position: absolute;
    top: -20px;
    left: -2px;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    z-index: 1000;
  }

  :global(.monaco-editor .remote-selection) {
    opacity: 0.3;
  }

  :global(.monaco-editor .remote-cursor-glyph) {
    width: 3px !important;
    left: -1px !important;
  }
</style>