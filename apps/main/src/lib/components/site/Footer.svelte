<script>
  export let columns = [
    { title: 'Produit', links: [ 'Fonctionnalités', 'Feuille de route', 'Statut' ] },
    { title: 'Entreprise', links: [ 'À propos', 'Presse', 'Jobs' ] },
    { title: 'Ressources', links: [ 'Docs', 'API', 'Support' ] }
  ];
  export let brand = 'Constructor';
  export let year = new Date().getFullYear();
</script>

<footer class="bg-gray-950 text-gray-300 pt-16 pb-10 mt-24 relative overflow-hidden">
  <div class="absolute inset-0 pointer-events-none opacity-40" style="background: radial-gradient(circle at 30% 30%, rgba(59,130,246,0.25), transparent 70%);"></div>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-10">
      <div class="col-span-2 md:col-span-2">
        <h3 class="text-lg font-semibold text-white mb-4">{brand}</h3>
        <p class="text-sm leading-relaxed text-gray-400 max-w-sm">Plateforme modulaire pour générer et assembler rapidement des interfaces professionnelles Svelte.</p>
        <div class="flex items-center gap-4 mt-6 text-xl text-gray-400">
          <a href="#" aria-label="Twitter" class="hover:text-white transition-colors"><i class="fab fa-x-twitter"></i></a>
          <a href="#" aria-label="GitHub" class="hover:text-white transition-colors"><i class="fab fa-github"></i></a>
          <a href="#" aria-label="Discord" class="hover:text-white transition-colors"><i class="fab fa-discord"></i></a>
        </div>
      </div>
      {#each columns as col}
        <div>
          <h4 class="text-sm font-semibold tracking-wide text-white mb-4 uppercase">{col.title}</h4>
            <ul class="space-y-2 text-sm">
              {#each col.links as l}
                <li><a href="#" class="hover:text-white transition-colors">{l}</a></li>
              {/each}
            </ul>
        </div>
      {/each}
    </div>
    <div class="mt-12 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
      <p>© {year} {brand}. Tous droits réservés.</p>
      <div class="flex gap-4">
        <a href="#" class="hover:text-gray-300">Confidentialité</a>
        <a href="#" class="hover:text-gray-300">Conditions</a>
        <a href="#" class="hover:text-gray-300">Cookies</a>
      </div>
    </div>
  </div>
</footer>