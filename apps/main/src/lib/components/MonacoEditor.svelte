<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { loader } from '@monaco-editor/loader';
  
  export let value = '';
  export let language = 'javascript';
  export let theme = 'vs-dark';
  export let height = '400px';
  export let width = '100%';
  export let options = {};
  
  const dispatch = createEventDispatcher();
  
  let container: HTMLDivElement;
  let editor: any;
  let monaco: any;
  
  onMount(async () => {
    try {
      // Load Monaco dynamically to avoid SSR issues
      monaco = await loader.init();
      
      // Configure Monaco for Svelte/TypeScript
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        allowJs: true,
        esModuleInterop: true
      });
      
      // Add Skeleton UI types for autocompletion
      const skeletonTypes = `
declare module '@skeletonlabs/skeleton' {
  export class AppBar {}
  export class Card {}
  export class Button {}
  export class Modal {}
  export class TabGroup {}
  export class Tab {}
  export class Avatar {}
  export class Badge {}
  export class ProgressBar {}
  export class ProgressRadial {}
  export class Table {}
  export class Accordion {}
  export class CodeBlock {}
  export class Drawer {}
  export class ListBox {}
  export class Popup {}
  export class RadioGroup {}
  export class SlideToggle {}
  export class Stepper {}
  export class TreeView {}
  export function modalStore(): any;
  export function drawerStore(): any;
  export function toastStore(): any;
  export function focusTrap(node: HTMLElement): any;
}`;
      
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        skeletonTypes,
        'file:///node_modules/@types/skeleton/index.d.ts'
      );
      
      // Create editor
      editor = monaco.editor.create(container, {
        value,
        language,
        theme,
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineHeight: 1.5,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: false,
        cursorStyle: 'line',
        ...options
      });
      
      // Listen to changes
      editor.onDidChangeModelContent(() => {
        const currentValue = editor.getValue();
        dispatch('change', { value: currentValue });
        value = currentValue;
      });
      
      // Focus management
      editor.onDidFocusEditorText(() => {
        dispatch('focus');
      });
      
      editor.onDidBlurEditorText(() => {
        dispatch('blur');
      });
      
      console.log('[MonacoEditor] Initialized successfully');
      
    } catch (error) {
      console.error('[MonacoEditor] Failed to initialize:', error);
    }
  });
  
  // Update editor when value changes externally
  $: if (editor && value !== editor.getValue()) {
    editor.setValue(value);
  }
  
  // Update language
  $: if (editor && monaco) {
    monaco.editor.setModelLanguage(editor.getModel(), language);
  }
  
  // Update theme
  $: if (monaco) {
    monaco.editor.setTheme(theme);
  }
  
  export function focus() {
    editor?.focus();
  }
  
  export function getValue() {
    return editor?.getValue() ?? '';
  }
  
  export function setValue(newValue: string) {
    editor?.setValue(newValue);
  }
  
  export function insertText(text: string) {
    if (!editor) return;
    const position = editor.getPosition();
    editor.executeEdits('', [{
      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
      text
    }]);
  }
  
  export function formatCode() {
    editor?.getAction('editor.action.formatDocument')?.run();
  }
</script>

<div 
  bind:this={container} 
  style="width: {width}; height: {height};"
  class="monaco-editor-container border border-surface-300 dark:border-surface-600 rounded-lg overflow-hidden"
/>

<style>
  .monaco-editor-container {
    background: var(--color-surface-100);
  }
  
  :global(.monaco-editor) {
    background: transparent !important;
  }
  
  :global(.monaco-editor .margin) {
    background: var(--color-surface-200) !important;
  }
  
  :global(.monaco-editor .monaco-editor-background) {
    background: var(--color-surface-100) !important;
  }
</style>