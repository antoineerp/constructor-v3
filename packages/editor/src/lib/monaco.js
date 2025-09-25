import * as monaco from 'monaco-editor';

/**
 * Configuration et utilitaires pour Monaco Editor
 */

// Configuration par défaut de Monaco
export const defaultMonacoConfig = {
  theme: 'vs-dark',
  fontSize: 14,
  fontFamily: 'Fira Code, Monaco, Menlo, Consolas, monospace',
  minimap: { enabled: true },
  automaticLayout: true,
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  lineNumbers: 'on',
  renderWhitespace: 'selection',
  tabSize: 2,
  insertSpaces: true,
  formatOnPaste: true,
  formatOnType: true
};

// Langages supportés avec leurs extensions
export const supportedLanguages = {
  javascript: ['js', 'mjs'],
  typescript: ['ts'],
  svelte: ['svelte'],
  html: ['html'],
  css: ['css'],
  scss: ['scss'],
  json: ['json'],
  markdown: ['md'],
  yaml: ['yaml', 'yml']
};

/**
 * Initialise Monaco Editor avec la configuration SvelteKit
 */
export function initializeMonaco() {
  // Configuration du thème sombre personnalisé
  monaco.editor.defineTheme('constructor-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'function', foreground: 'DCDCAA' }
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editorCursor.foreground': '#AEAFAD',
      'editor.lineHighlightBackground': '#2D2D30',
      'editorLineNumber.foreground': '#858585',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41'
    }
  });

  // Configuration du thème clair personnalisé
  monaco.editor.defineTheme('constructor-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0000FF' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'function', foreground: '795E26' }
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#000000'
    }
  });

  // Configuration de la validation TypeScript
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ES2015,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.Preserve,
    allowJs: true,
    typeRoots: ['node_modules/@types']
  });

  // Configuration pour Svelte
  monaco.languages.register({ id: 'svelte' });
  monaco.languages.setMonarchTokensProvider('svelte', {
    tokenizer: {
      root: [
        [/<\/?[a-zA-Z][\w:]*/, 'tag'],
        [/{[^}]*}/, 'expression'],
        [/@[a-zA-Z]+/, 'directive'],
        [/<!--.*?-->/, 'comment'],
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string']
      ]
    }
  });
}

/**
 * Détecte le langage d'un fichier basé sur son extension
 */
export function detectLanguage(filename) {
  if (!filename) return 'javascript';
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  for (const [language, extensions] of Object.entries(supportedLanguages)) {
    if (extensions.includes(extension)) {
      return language;
    }
  }
  
  return 'javascript';
}

/**
 * Crée un modèle Monaco pour un fichier
 */
export function createMonacoModel(content, filename, uri) {
  const language = detectLanguage(filename);
  const modelUri = monaco.Uri.parse(uri || `file:///${filename}`);
  
  // Supprimer le modèle existant s'il existe
  const existingModel = monaco.editor.getModel(modelUri);
  if (existingModel) {
    existingModel.dispose();
  }
  
  return monaco.editor.createModel(content, language, modelUri);
}

/**
 * Configuration des snippets pour SvelteKit
 */
export function setupSvelteSnippets() {
  monaco.languages.registerCompletionItemProvider('svelte', {
    provideCompletionItems: (model, position) => {
      const suggestions = [
        {
          label: 'svelte:component',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<svelte:component this={${1:component}} />',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Dynamic component'
        },
        {
          label: 'script',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<script>\n\t${1}\n</script>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Script block'
        },
        {
          label: 'each',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '{#each ${1:items} as ${2:item}}\n\t${3}\n{/each}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Each block'
        },
        {
          label: 'if',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '{#if ${1:condition}}\n\t${2}\n{/if}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'If block'
        },
        {
          label: 'await',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '{#await ${1:promise}}\n\t${2:loading...}\n{:then ${3:result}}\n\t${4}\n{:catch ${5:error}}\n\t${6}\n{/await}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Await block'
        }
      ];
      
      return { suggestions };
    }
  });
}

/**
 * Formate le code avec Prettier (simulation)
 */
export async function formatCode(code, language) {
  // Dans un vrai projet, on utiliserait Prettier ici
  // Pour la démo, on retourne le code tel quel
  return code;
}

/**
 * Valide le code Svelte/TypeScript
 */
export function validateCode(model) {
  const markers = [];
  const content = model.getValue();
  
  // Validation basique - dans un vrai projet, on utiliserait svelte-check
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Vérifier les balises non fermées (très basique)
    const openTags = (line.match(/<[^\/][^>]*>/g) || []).length;
    const closeTags = (line.match(/<\/[^>]*>/g) || []).length;
    
    if (openTags > closeTags && !line.includes('/>')) {
      // Possiblement une balise non fermée
      const match = line.match(/<([a-zA-Z][a-zA-Z0-9]*)/);
      if (match && !['input', 'img', 'br', 'hr', 'meta'].includes(match[1])) {
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          startLineNumber: index + 1,
          startColumn: 1,
          endLineNumber: index + 1,
          endColumn: line.length + 1,
          message: `Balise "${match[1]}" possiblement non fermée`
        });
      }
    }
  });
  
  monaco.editor.setModelMarkers(model, 'svelte-validator', markers);
  return markers;
}