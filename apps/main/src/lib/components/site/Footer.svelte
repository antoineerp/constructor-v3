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
          <a href="https://twitter.com" rel="noopener" target="_blank" aria-label="Twitter" class="hover:text-white transition-colors"><i class="fab fa-x-twitter"></i></a>
          <a href="https://github.com" rel="noopener" target="_blank" aria-label="GitHub" class="hover:text-white transition-colors"><i class="fab fa-github"></i></a>
          <a href="https://discord.com" rel="noopener" target="_blank" aria-label="Discord" class="hover:text-white transition-colors"><i class="fab fa-discord"></i></a>
        </div>
      </div>
      {#each columns as col}
        <div>
          <h4 class="text-sm font-semibold tracking-wide text-white mb-4 uppercase">{col.title}</h4>
            <ul class="space-y-2 text-sm">
              {#each col.links as l}
                <li><button type="button" class="hover:text-white transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded px-1">{l}</button></li>
              {/each}
            </ul>
        </div>
      {/each}
    </div>
    <div class="mt-12 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
      <p>© {year} {brand}. Tous droits réservés.</p>
      <div class="flex gap-4">
  <button type="button" class="hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded px-1">Confidentialité</button>
  <button type="button" class="hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded px-1">Conditions</button>
  <button type="button" class="hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded px-1">Cookies</button>
      </div>
    </div>
  </div>
</footer>