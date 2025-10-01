// Sélection automatique de la stack UI (shadcn, skeleton, flowbite) combinée avec Bits UI
// Basé sur des signaux extraits du prompt utilisateur ou du contexte.

export type StackId = 'shadcn' | 'skeleton' | 'flowbite';

export interface StackSignals {
  appType?: 'blog'|'landing'|'dashboard'|'saas'|'docs';
  needsTheming?: boolean;
  complexForms?: boolean;
  dataTables?: boolean;
  speedFirst?: boolean;
  ownTheCode?: boolean;
}

export interface StackDecision {
  stack: StackId;
  scores: Record<StackId, number>;
  signals: StackSignals;
  reasoning: string[]; // trace heuristique
}

export function chooseStack(signals: StackSignals): StackDecision {
  const score: Record<StackId, number> = { shadcn:0, skeleton:5, flowbite:0 }; // Skeleton par défaut (+5)
  const reasons: string[] = ['skeleton+5: Default Svelte-native UI framework'];
  const s = { ...signals };

  function add(id: StackId, pts: number, reason: string){ score[id]+=pts; reasons.push(`${id}+${pts}: ${reason}`); }

  switch(s.appType){
    case 'dashboard': case 'saas': add('skeleton',3,'appType métier/dash (Skeleton themes)'); break;
    case 'docs': add('skeleton',3,'docs orienté thèmes'); break;
    case 'landing': add('skeleton',3,'landing branding'); add('flowbite',1,'landing speed'); break;
    case 'blog': add('skeleton',2,'blog léger theming'); add('flowbite',1,'blog rapide'); break;
  }
  if(s.needsTheming) add('skeleton',4,'tokens/themes forts (Skeleton best)');
  if(s.complexForms) add('skeleton',2,'forms avec Skeleton native'); add('shadcn',1,'forms complexes');
  if(s.dataTables) add('skeleton',2,'tables Skeleton'); add('shadcn',1,'tables/accès patterns');
  if(s.speedFirst) add('skeleton',3,'time-to-ship avec Skeleton'); add('flowbite',1,'flowbite rapide');
  if(s.ownTheCode) add('skeleton',3,'composants Skeleton modulaires'); add('shadcn',1,'copie code composants');

  // Tie-breakers - Skeleton wins by default
  const max = Math.max(score.shadcn, score.skeleton, score.flowbite);
  let stack: StackId = 'skeleton'; // Default to Skeleton
  if(score.skeleton === max) stack = 'skeleton';
  else if(score.shadcn === max) stack = 'shadcn';
  else if(score.flowbite === max) stack = 'flowbite';

  return { stack, scores: score, signals: s, reasoning: reasons };
}

// Extraction heuristique super simple (MVP) depuis le prompt texte.
// Peut être amélioré avec un modèle plus tard.
export function extractSignalsFromPrompt(prompt: string): StackSignals {
  const p = (prompt||'').toLowerCase();
  const signals: StackSignals = {};
  if(/dashboard|admin|crm|workflow|kanban|permissions|backoffice/.test(p)) { signals.appType='dashboard'; signals.complexForms=true; }
  else if(/saas/.test(p)) { signals.appType='saas'; signals.complexForms=true; }
  else if(/documentation|docs|guide/.test(p)) { signals.appType='docs'; }
  else if(/landing|marketing|hero|cta/.test(p)) { signals.appType='landing'; }
  else if(/blog|articles?/.test(p)) { signals.appType='blog'; }

  if(/th(é|e)me|branding|charte|palette|tokens?/.test(p)) signals.needsTheming = true;
  if(/formulaire complexe|multi-?étapes|wizard|validation/.test(p)) signals.complexForms = true;
  if(/table(au)? (de )?donn(é|e)es|datatable|tri|filtrage|pagination/.test(p)) signals.dataTables = true;
  if(/vite|rapidement|minimal|prototype|po?c\b/.test(p)) signals.speedFirst = true;
  if(/poss(é|e)der le code|code complet|copie des composants|sans dépendance externe/.test(p)) signals.ownTheCode = true;
  return signals;
}

// Mapping stack -> blueprint id existant (actuellement)
export function mapStackToBlueprint(stack: StackId): string {
  switch(stack){
    case 'shadcn': return 'shadcn-skeleton'; // contient déjà shadcn + skeleton tokens
    case 'skeleton': return 'skeleton-base';
    case 'flowbite': return 'flowbite-kit';
    default: return 'skeleton-base';
  }
}
