// Catalogue de composants "validés" réutilisables par l'IA
// Chaque entrée peut être référencée dans les prompts pour forcer la génération à importer
// plutôt que dupliquer du markup.

export const componentsCatalog = [
  {
    name: 'HeaderPro',
    filename: 'src/lib/components/HeaderPro.svelte',
    purpose: 'Barre de navigation sticky avec logo et menu responsive',
    tags: ['layout','navigation','branding'],
    code: `<script>
  export let title = 'Le Blog des Motos';
  let open = false;
</script>
<header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
  <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
    <div class="flex items-center gap-2 font-semibold text-indigo-600">
      <i class="fas fa-motorcycle"></i>
      <span>{title}</span>
    </div>
    <nav class="hidden md:flex gap-6 text-sm">
      <a href="/" class="hover:text-indigo-600">Accueil</a>
      <a href="/articles" class="hover:text-indigo-600">Articles</a>
      <a href="/contact" class="hover:text-indigo-600">Contact</a>
    </nav>
    <button class="md:hidden p-2" on:click={() => open = !open} aria-label="Menu mobile">
      <i class="fas {open ? 'fa-xmark' : 'fa-bars'}"></i>
    </button>
  </div>
  {#if open}
    <div class="md:hidden border-t bg-white px-4 py-3 space-y-2 text-sm">
      <a href="/" class="block">Accueil</a>
      <a href="/articles" class="block">Articles</a>
      <a href="/contact" class="block">Contact</a>
    </div>
  {/if}
</header>`
  },
  {
    name: 'FooterPro',
    filename: 'src/lib/components/FooterPro.svelte',
    purpose: 'Pied de page simple avec liens réseaux sociaux',
    tags: ['layout'],
    code: `<footer class="mt-16 bg-gray-900 text-gray-300 text-sm">
  <div class="max-w-7xl mx-auto px-4 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
    <div>
      <h3 class="font-semibold text-white mb-2">À propos</h3>
      <p class="text-gray-400 leading-relaxed">Blog passionné dédié aux motos, à la mécanique et à la culture deux‑roues.</p>
    </div>
    <div>
      <h3 class="font-semibold text-white mb-2">Navigation</h3>
      <ul class="space-y-1">
        <li><a href="/" class="hover:text-white">Accueil</a></li>
        <li><a href="/articles" class="hover:text-white">Articles</a></li>
        <li><a href="/contact" class="hover:text-white">Contact</a></li>
      </ul>
    </div>
    <div>
      <h3 class="font-semibold text-white mb-2">Réseaux</h3>
      <div class="flex gap-3 text-lg">
        <a href="#" aria-label="Twitter" class="hover:text-white"><i class="fab fa-x-twitter"></i></a>
        <a href="#" aria-label="Instagram" class="hover:text-white"><i class="fab fa-instagram"></i></a>
        <a href="#" aria-label="YouTube" class="hover:text-white"><i class="fab fa-youtube"></i></a>
      </div>
    </div>
    <div>
      <h3 class="font-semibold text-white mb-2">Newsletter</h3>
      <form class="space-y-2">
        <input type="email" placeholder="Email" class="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:outline-none" />
        <button class="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm">S'abonner</button>
      </form>
    </div>
  </div>
  <div class="border-t border-gray-800 text-center py-4 text-xs text-gray-500">© {new Date().getFullYear()} Blog Motos. Tous droits réservés.</div>
</footer>`
  },
  {
    name: 'HeroSplit',
    filename: 'src/lib/components/HeroSplit.svelte',
    purpose: 'Section hero deux colonnes avec CTA',
    tags: ['hero','marketing'],
    code: `<section class="relative overflow-hidden py-16 md:py-24 bg-gradient-to-br from-indigo-50 to-white">
  <div class="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
    <div>
      <h1 class="text-3xl md:text-5xl font-extrabold leading-tight mb-6"><span class="text-indigo-600">Passion & Performance</span> sur Deux Roues</h1>
      <p class="text-gray-600 mb-6 text-lg">Actus, revues de modèles, préparation, accessoires et conseils d'entretien pour vivre la moto intensément.</p>
      <div class="flex flex-wrap gap-4">
        <a href="/articles" class="px-6 py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow">Lire les articles</a>
        <a href="/contact" class="px-6 py-3 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-medium">Nous contacter</a>
      </div>
    </div>
    <div class="relative">
      <div class="aspect-[4/3] rounded-xl bg-gray-200 overflow-hidden shadow-lg ring-1 ring-gray-300">
        <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=870&q=60" alt="Moto" class="w-full h-full object-cover" />
      </div>
    </div>
  </div>
</section>`
  },
  {
    name: 'ArticleCardPro',
    filename: 'src/lib/components/ArticleCardPro.svelte',
    purpose: 'Carte article avec image, titre, excerpt et lien',
    tags: ['card','article'],
    code: `<script>export let article;</script>
<article class="group relative flex flex-col bg-white border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
  <div class="aspect-video bg-gray-100 overflow-hidden">
    <img src={article.image || 'https://picsum.photos/400/225'} alt={article.title} class="w-full h-full object-cover group-hover:scale-105 transition"/>
  </div>
  <div class="p-4 flex flex-col gap-2">
    <h3 class="font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2">{article.title}</h3>
    <p class="text-xs text-gray-500 uppercase tracking-wide">{article.category || 'Moto'}</p>
    <p class="text-sm text-gray-600 line-clamp-3">{article.excerpt}</p>
    <a href={'/articles/' + article.slug} class="mt-auto inline-flex items-center gap-1 text-sm text-indigo-600 font-medium hover:underline">Lire <i class="fas fa-arrow-right text-xs"></i></a>
  </div>
</article>`
  },
  {
    name: 'CommentSection',
    filename: 'src/lib/components/CommentSection.svelte',
    purpose: 'Zone commentaires statique (mock) avec formulaire',
    tags: ['comments','interaction'],
    code: `<script>
  export let comments = [
    { id: 1, author: 'Alex', text: 'Super article, merci !' },
    { id: 2, author: 'Nina', text: 'J'adore ce modèle.' }
  ];
</script>
<section class="mt-12">
  <h2 class="text-xl font-semibold mb-4 flex items-center gap-2"><i class="fas fa-comments text-indigo-600"></i>Commentaires</h2>
  <div class="space-y-4">
    {#each comments as c}
      <div class="p-4 rounded border bg-white">
        <p class="text-sm text-gray-700"><span class="font-semibold">{c.author}</span> — {c.text}</p>
      </div>
    {/each}
  </div>
  <form class="mt-6 space-y-3">
    <textarea rows="3" placeholder="Votre commentaire" class="w-full px-3 py-2 border rounded focus:ring-indigo-500 focus:border-indigo-500 text-sm"></textarea>
    <button type="button" class="px-5 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">Envoyer</button>
  </form>
</section>`
  }
];

// Fonction utilitaire pour résumer le catalogue sans injecter TOUT le code (économie de tokens)
export function summarizeCatalog(maxChars = 1800){
  return componentsCatalog.map(c => `${c.name} -> ${c.filename} : ${c.purpose}`).join('\n').slice(0, maxChars);
}
