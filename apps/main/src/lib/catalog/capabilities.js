// Capabilities: mapping conceptuelles -> keywords -> composants requis / suggestions routes
// Objectif: enrichir la sélection de composants et le prompt global.

export const CAPABILITIES = [
  {
    id: 'blog',
    keywords: ['blog','article','posts','news','publication','content marketing'],
    requiredComponents: ['ArticleCardPro','CommentSection','HeroSplit','HeaderPro','FooterPro'],
    suggestedRoutes: ['/articles','/articles/:slug'],
    weight: 4
  },
  {
    id: 'ecommerce',
    keywords: ['ecommerce','produit','panier','pricing','vente','commerce','store'],
    requiredComponents: ['PricingTable','HeroSplit','HeaderPro','FooterPro'],
    suggestedRoutes: ['/pricing'],
    weight: 5
  },
  {
    id: 'dashboard',
    keywords: ['dashboard','admin','kpi','stats','analytics','tableau de bord'],
    requiredComponents: ['DashboardShell','StatCards','SidebarCollapsible','TableSortable'],
    suggestedRoutes: ['/dashboard'],
    weight: 6
  },
  {
    id: 'auth',
    keywords: ['auth','login','connexion','signup','register','compte','utilisateur'],
    requiredComponents: ['AuthLoginForm','HeaderPro','FooterPro'],
    suggestedRoutes: ['/login','/register'],
    weight: 5
  },
  {
    id: 'docs',
    keywords: ['documentation','docs','api','guide','developer'],
    requiredComponents: ['SidebarCollapsible','HeaderPro','FooterPro','MarkdownRenderer'],
    suggestedRoutes: ['/docs','/docs/:slug'],
    weight: 3
  },
  {
    id: 'search',
    keywords: ['search','recherche','rechercher'],
    requiredComponents: ['SearchBar'],
    suggestedRoutes: [],
    weight: 2
  },
  {
    id: 'notifications',
    keywords: ['notification','alert','toast'],
    requiredComponents: ['NotificationToast'],
    suggestedRoutes: [],
    weight: 2
  },
  {
    id: 'interaction',
    keywords: ['drag','drop','tri','glisser','réordonner'],
    requiredComponents: ['DragList','TableSortable'],
    suggestedRoutes: [],
    weight: 2
  },
  {
    id: 'forms',
    keywords: ['formulaire','contact','inscription','newsletter','feedback'],
    requiredComponents: ['FormContactPro','FormNewsletter'],
    suggestedRoutes: ['/contact'],
    weight: 3
  },
  {
    id: 'marketing',
    keywords: ['landing','hero','marketing','cta'],
    requiredComponents: ['HeroSplit','PricingTable','HeaderPro','FooterPro'],
    suggestedRoutes: ['/pricing'],
    weight: 3
  }
  ,{
    id: 'invoicing',
    keywords: ['facture','facturation','invoice','billing','devis','paiement','paiements'],
    requiredComponents: ['InvoiceList','InvoiceEditor','HeaderPro','FooterPro'],
    suggestedRoutes: ['/invoices','/invoices/:id'],
    weight: 6
  }
  ,{
    id: 'i18n',
    keywords: ['multilingue','multilangues','multi-langues','multi-langue','internationalisation','internationalization','i18n','traduction'],
    requiredComponents: ['LanguageSwitcher','HeaderPro','FooterPro'],
    suggestedRoutes: ['/hello'],
    weight: 4
  }
  ,{
    id: 'crm',
    keywords: ['crm','client','clients','pipeline','prospect','prospects','deal','deals','opportunité','opportunites','relation client','gestion client'],
    requiredComponents: ['CustomerList','CustomerDetail','KpiCards'],
    suggestedRoutes: ['/clients','/clients/:id','/dashboard'],
    weight: 7
  }
  ,{
    id: 'analytics',
    keywords: ['analytics','analyse','kpi','graphique','chart','statistiques','metrics'],
    requiredComponents: ['SalesChart','KpiCards'],
    suggestedRoutes: ['/dashboard'],
    weight: 6
  }
  ,{
    id: 'data_table',
    keywords: ['table','tableau','liste','pagination','tri','filtre','filter'],
    requiredComponents: ['DataTable'],
    suggestedRoutes: ['/clients'],
    weight: 5
  }
];

export function detectCapabilities(blueprint){
  if(!blueprint) return [];
  // Fallback lexical; embedding scoring injecté plus tard (fonction async dédiée)
  const text = JSON.stringify(blueprint).toLowerCase();
  const hits = [];
  for(const cap of CAPABILITIES){
    let lexical = 0;
    for(const kw of cap.keywords){ if(text.includes(kw)) lexical += 1; }
    if(lexical>0){ hits.push({ id: cap.id, score: lexical * (cap.weight||1), cap, lexical }); }
  }
  return hits.sort((a,b)=> b.score - a.score);
}

// Version async avec embeddings pour affiner (ajuste score plutôt que remplacer)
import { openaiService } from '$lib/openaiService.js';
import { getEmbeddingCache, setEmbeddingCache, cosineSim } from './embeddingCache.js';

async function embed(text){
  const key = 'cap:' + text;
  let emb = getEmbeddingCache(key);
  if(!emb){
    emb = await openaiService.generateEmbedding(text);
    setEmbeddingCache(key, emb);
  }
  return emb;
}

export async function detectCapabilitiesWithEmbeddings(blueprint){
  const base = detectCapabilities(blueprint); // lexical first
  const bpText = JSON.stringify(blueprint).slice(0,4000);
  let bpEmb = null;
  try { bpEmb = await embed(bpText); } catch(e){ console.warn('Embedding blueprint failed', e.message); }
  if(!bpEmb) return base;
  // For each capability build synthetic sentence and embed
  for(const h of base){
    const sentence = `${h.cap.id}: ${h.cap.keywords.join(', ')}`;
    try {
      const cEmb = await embed(sentence);
      const sim = cosineSim(bpEmb, cEmb);
      h.score = h.score + sim * 5; // adjust weight
      h.similarity = sim;
    } catch(e){ /* ignore */ }
  }
  return base.sort((a,b)=> b.score - a.score);
}

export function deriveCapabilityComponents(capHits){
  const set = new Set();
  for(const h of capHits){
    for(const c of h.cap.requiredComponents||[]) set.add(c);
  }
  return Array.from(set);
}

export function enrichRoutesWithCapabilities(blueprint, capHits){
  if(!blueprint.routes) blueprint.routes = [];
  const existing = new Set(blueprint.routes.map(r=> r.path));
  for(const h of capHits){
    for(const r of h.cap.suggestedRoutes||[]){
      if(!existing.has(r)){
        blueprint.routes.push({ path: r, purpose: `auto:${h.id}`, sections: [] });
        existing.add(r);
      }
    }
  }
  return blueprint.routes;
}
