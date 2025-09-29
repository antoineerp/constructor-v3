// Utilitaire de réécriture d'import pour preview & compilation
// Règles:
// - src/lib/...  -> $lib/...
// - src/routes/... -> chemin relatif depuis le fichier (warning meta)
// - imports locaux sans ./ ou ../ -> si module unique trouvé dans même dossier ou src/lib, réécrire
// - ajout extension si manquante (priorité .svelte, .ts, .js)
// - éviter de toucher aux 'svelte', '@', 'http', 'https', '$lib', 'data:' etc

import { init, parse } from 'es-module-lexer';
import MagicString from 'magic-string';

export interface ProjectIndex {
  has(path: string): boolean;
  // retourne liste de candidats relatifs depuis le fichier courant
  resolveLocal(baseFile: string, spec: string): string[];
}

export interface RewriteResult {
  code: string;
  changed: boolean;
  edits: { from: string; to: string; pos: number }[];
  warnings: string[];
}

const IGNORED_PREFIX = /^(?:svelte|@|https?:|data:|\$lib|node:)/;

export async function rewriteImports(filename: string, code: string, index: ProjectIndex): Promise<RewriteResult> {
  await init; // es-module-lexer init
  const ms = new MagicString(code);
  const [imports] = parse(code);
  const edits: RewriteResult['edits'] = [];
  const warnings: string[] = [];

  function addExtensionIfNeeded(spec: string): string {
    if (/\.(svelte|ts|js|mjs|cjs)$/.test(spec)) return spec;
    const exts = ['.svelte', '.ts', '.js'];
    for (const ext of exts) {
      const candidate = spec + ext;
      // pour éviter de dépendre intégralement de l'index, on tente plusieurs paths
      if (index.has(candidate) || index.has(candidate.replace(/^\$lib\//, 'src/lib/'))) return candidate;
    }
    return spec;
  }

  for (const imp of imports) {
    const raw = code.slice(imp.s, imp.e);
    if (!raw || /\0/.test(raw)) continue;
    let spec = raw;

    // 1) src/lib -> $lib
    if (spec.startsWith('src/lib/')) {
      const to = '$lib/' + spec.slice('src/lib/'.length);
      ms.overwrite(imp.s, imp.e, to);
      edits.push({ from: spec, to, pos: imp.s });
      continue;
    }

    // 2) src/routes -> tentative relative
    if (spec.startsWith('src/routes/')) {
      // On ne devrait pas importer une route directement
      warnings.push(`Import d'une route interdit: ${spec}`);
      // calculer chemin relatif grossier vers fichier ciblé (sans garantie). On laisse l'utilisateur corriger.
      const rel = spec.replace(/^src\//, '../');
      ms.overwrite(imp.s, imp.e, rel);
      edits.push({ from: spec, to: rel, pos: imp.s });
      continue;
    }

    if (IGNORED_PREFIX.test(spec) || spec.startsWith('.') || spec.startsWith('/')) {
      // potentiellement juste ajouter extension manquante
      const withExt = addExtensionIfNeeded(spec);
      if (withExt !== spec) {
        ms.overwrite(imp.s, imp.e, withExt);
        edits.push({ from: spec, to: withExt, pos: imp.s });
      }
      continue;
    }

    // 3) import nu potentiel local (ex: components/Button)
    const candidates = index.resolveLocal(filename, spec);
    if (candidates.length === 1) {
      let rel = candidates[0];
      rel = addExtensionIfNeeded(rel);
      // normaliser pour commencer par ./ ou ../
      if (!rel.startsWith('.')) rel = './' + rel;
      ms.overwrite(imp.s, imp.e, rel);
      edits.push({ from: spec, to: rel, pos: imp.s });
      continue;
    } else if (candidates.length > 1) {
      warnings.push(`Import ambigu '${spec}' => ${candidates.join(', ')}`);
    }

    // 4) tenter $lib/ si le module existe sous src/lib
    const libPath = 'src/lib/' + spec;
    if (index.has(libPath) || ['.svelte', '.ts', '.js'].some(ext => index.has(libPath + ext))) {
      const to = '$lib/' + spec;
      const withExt = addExtensionIfNeeded(to);
      ms.overwrite(imp.s, imp.e, withExt);
      edits.push({ from: spec, to: withExt, pos: imp.s });
      continue;
    }

    // 5) extension manquante seule
    const withExt = addExtensionIfNeeded(spec);
    if (withExt !== spec) {
      ms.overwrite(imp.s, imp.e, withExt);
      edits.push({ from: spec, to: withExt, pos: imp.s });
    }
  }

  return { code: ms.hasChanged() ? ms.toString() : code, changed: ms.hasChanged(), edits, warnings };
}
