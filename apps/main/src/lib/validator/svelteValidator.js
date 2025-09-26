// Simple validator & auto-fixer for generated Svelte files
// Heuristics only: not a full parser. Goal: catch common AI generation issues.
// Export validateAndFix(contents: string, {filename}) => { fixed, issues: string[], critical: boolean }

const FENCE_RE = /```[a-zA-Z]*\n?|```/g;
const VOID_TAGS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const HTML_KNOWN = new Set(['div','span','p','a','ul','ol','li','header','footer','nav','section','article','main','aside','form','input','button','select','option','textarea','h1','h2','h3','h4','h5','h6','img','table','thead','tbody','tr','td','th','figure','figcaption']);

export function validateAndFix(content, { filename } = {}) {
  const issues = [];
  let fixed = content || '';

  if (FENCE_RE.test(fixed)) {
    fixed = fixed.replace(FENCE_RE, '');
    issues.push('Removed markdown fences');
  }
  const beforeTrim = fixed;
  fixed = fixed.trimStart();
  if (beforeTrim !== fixed) issues.push('Trimmed leading whitespace/BOM');

  // Merge multiple script tags
  const scriptTags = (fixed.match(/<script[\s>]/g) || []).length;
  if (scriptTags > 1) {
    const merged = [];
    fixed = fixed.replace(/<script[\s\S]*?<\/script>/g, (block) => {
      const inner = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
      merged.push(inner.trim());
      return '';
    });
    fixed = `<script>\n${merged.join('\n')}\n<\/script>\n` + fixed.trim();
    issues.push('Merged multiple <script> blocks');
  }

  // Curly balance (heuristic)
  const openCurly = (fixed.match(/\{/g) || []).length;
  const closeCurly = (fixed.match(/\}/g) || []).length;
  if (closeCurly > openCurly) {
    const diff = closeCurly - openCurly;
    let removed = 0;
    fixed = fixed.replace(/\}+$/g, (m) => {
      if (m.length <= diff) { removed = m.length; return ''; }
      removed = diff; return m.slice(0, m.length - diff);
    });
    if (removed) issues.push(`Removed ${removed} trailing '}' characters`);
  }

  // Tag balance heuristic (ignore Svelte directives)
  const tagRegex = /<\/?([A-Za-z0-9_:-]+)(\s[^>]*)?>/g;
  const stack = [];
  let m;
  while ((m = tagRegex.exec(fixed))) {
    const full = m[0];
    const name = m[1];
    if (!name) continue;
    if (name.startsWith('!') || name.startsWith('?')) continue; // comments/doctype
    const lower = name.toLowerCase();
    const isClosing = full.startsWith('</');
    const selfClose = full.endsWith('/>') || VOID_TAGS.has(lower);
    if (!isClosing && !selfClose) {
      stack.push(name);
    } else if (isClosing) {
      // find last matching
      let idx = stack.length - 1;
      while (idx >= 0 && stack[idx] !== name) idx--;
      if (idx === -1) {
        issues.push(`Unmatched closing tag </${name}>`);
      } else {
        stack.splice(idx, 1);
      }
    }
  }
  if (stack.length) {
    issues.push(`Unclosed tags: ${stack.join(', ')}`);
  }

  if (!fixed.trim()) {
    issues.push('File content empty after fixes');
  }

  if (filename && filename.endsWith('+page.svelte')) {
    if (!/<main[\s>]/.test(fixed) && !/<section[\s>]/.test(fixed) && !/<div[\s>]/.test(fixed)) {
      fixed += '\n<div class="p-8 text-gray-500">(Page vide)</div>';
      issues.push('Inserted fallback container in empty page');
    }
  }

  // Detect probable component usages not standard HTML (Capitalized tags) -> potential missing imports (heuristic; Svelte w/out imports is allowed if in same file? but we flag)
  const compCandidates = new Set();
  const compRegex = /<([A-Z][A-Za-z0-9]+)/g;
  while ((m = compRegex.exec(fixed))) { compCandidates.add(m[1]); }
  if (compCandidates.size) {
    issues.push(`Component tags detected: ${Array.from(compCandidates).join(', ')}`);
  }

  const critical = issues.some(i => /Unclosed|Unmatched|empty|trailing/.test(i));
  return { fixed, issues, critical };
}

export function unifyPalette(content, palette) {
  if (!palette || !palette.length) return { content, replacements: 0 };
  const hexRegex = /#([0-9a-fA-F]{6})/g;
  let replacements = 0;
  const allowed = new Set(palette.map(p => p.toLowerCase()));
  const primary = palette[0];
  const updated = content.replace(hexRegex, (m) => {
    return allowed.has(m.toLowerCase()) ? m : (replacements++, primary);
  });
  return { content: updated, replacements };
}

export function addAccessibilityFixes(content){
  let updated = content;
  const issues = [];
  // Add alt="" to img without alt
  updated = updated.replace(/<img([^>]*?)>/g, (full, attrs) => {
    if (/alt=/.test(attrs)) return full;
    issues.push('Added empty alt to img');
    return `<img${attrs} alt="" />`;
  });
  // Ensure single h1 (if multiple, downgrade others to h2)
  const h1Matches = updated.match(/<h1[\s>]/g) || [];
  if (h1Matches.length > 1) {
    let first = true;
    updated = updated.replace(/<\/??h1([^>]*)>/g, (tag) => {
      if (tag.startsWith('</')) return first ? '</h1>' : '</h2>';
      if (first) { first = false; return tag; }
      return tag.replace('<h1', '<h2');
    });
    issues.push('Downgraded extra h1 to h2');
  }
  return { content: updated, issues };
}
