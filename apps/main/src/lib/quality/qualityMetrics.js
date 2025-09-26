// Module de calcul de métriques qualité (heuristiques locales)
// Entrées: { files, validationIssues, compileResults, blueprint, critic }
// Sortie: { score:0-100, grade:A-F, metrics:{...}, rationale:string[] }

export function computeQuality({ files = {}, validationIssues = {}, compileResults = {}, blueprint = null, critic = null }) {
  const rationale = [];
  const metrics = {};
  const fileCount = Object.keys(files).length;
  metrics.fileCount = fileCount;
  const issueCount = Object.values(validationIssues).reduce((a, arr) => a + (arr?.length || 0), 0);
  metrics.validationIssueCount = issueCount;
  const compileErrors = Object.values(compileResults).filter(r => !r.ok).length;
  metrics.compileErrors = compileErrors;
  const paletteSize = (blueprint?.color_palette || []).length;
  metrics.paletteSize = paletteSize;
  const hasLayout = !!files['src/routes/+layout.svelte'];
  metrics.hasLayout = hasLayout;
  const hasHome = !!files['src/routes/+page.svelte'];
  metrics.hasHome = hasHome;
  const criticApplied = !!(critic && critic.applied > 0);
  metrics.criticApplied = criticApplied;

  // Heuristique de densité de code: taille moyenne fichiers svelte
  const svelteFiles = Object.entries(files).filter(([k]) => k.endsWith('.svelte'));
  const avgSvelteBytes = svelteFiles.length ? Math.round(svelteFiles.reduce((a, [_, c]) => a + c.length, 0) / svelteFiles.length) : 0;
  metrics.avgSvelteBytes = avgSvelteBytes;

  let score = 100;
  if (issueCount) {
    score -= Math.min(40, issueCount * 1.2); // pénalité linéaire plafonnée
    rationale.push(`-${Math.min(40, issueCount * 1.2).toFixed(1)}: validation issues (${issueCount})`);
  }
  if (compileErrors) {
    score -= Math.min(25, compileErrors * 8);
    rationale.push(`-${Math.min(25, compileErrors * 8)}: compile errors (${compileErrors})`);
  }
  if (!hasHome) { score -= 15; rationale.push('-15: page racine manquante'); }
  if (!hasLayout && (blueprint?.layout_plan?.has_layout)) { score -= 8; rationale.push('-8: layout attendu manquant'); }
  if (paletteSize < 3) { score -= 5; rationale.push('-5: palette insuffisante'); }
  if (avgSvelteBytes < 120 && svelteFiles.length >= 3) { score -= 6; rationale.push('-6: composants trop courts (avg <120 chars)'); }
  if (criticApplied) { score += 4; rationale.push('+4: critic patches appliqués'); }

  if (score < 0) score = 0; if (score > 100) score = 100;

  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  return { score, grade, metrics, rationale };
}
