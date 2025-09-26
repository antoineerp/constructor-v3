<script>
  export let plans = [
    { name: 'Starter', price: 0, features: ['Génération basique', 'Composants limités'], cta:'Commencer', popular:false },
    { name: 'Pro', price: 29, features: ['Composants avancés', 'Export multi-fichiers', 'Support prioritaire'], cta:'Choisir Pro', popular:true },
    { name: 'Entreprise', price: 99, features: ['Accès complet', ' SLA ', 'Intégration dédiée'], cta:'Nous contacter', popular:false }
  ];
</script>

<section class="py-24 relative overflow-hidden">
  <div class="absolute inset-0 -z-10" style="background: radial-gradient(circle at 80% 40%, rgba(59,130,246,0.18), transparent 70%);"></div>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-14">
      <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Des tarifs adaptés</h2>
      <p class="text-gray-600 max-w-2xl mx-auto">Montez en puissance selon vos besoins de génération et d'assemblage.</p>
    </div>
    <div class="grid gap-8 md:grid-cols-3">
      {#each plans as p}
        <div class="relative rounded-2xl border {p.popular ? 'border-blue-500 shadow-xl shadow-blue-500/10' : 'border-gray-200'} bg-white p-8 flex flex-col">
          {#if p.popular}
            <span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-semibold px-3 py-1 rounded-full shadow">POPULAIRE</span>
          {/if}
          <h3 class="font-semibold text-gray-900 text-lg mb-2">{p.name}</h3>
          <div class="mb-6 flex items-baseline gap-1">
            <span class="text-4xl font-extrabold text-gray-900">{p.price}</span>
            <span class="text-sm text-gray-500">{p.price === 0 ? 'Gratuit' : '€ / mois'}</span>
          </div>
          <ul class="text-sm space-y-2 mb-6">
            {#each p.features as f}
              <li class="flex gap-2"><i class="fas fa-check text-blue-600 mt-0.5"></i><span>{f}</span></li>
            {/each}
          </ul>
          <button type="button" class="mt-auto text-sm font-semibold text-center inline-flex items-center justify-center px-5 py-3 rounded-lg border {p.popular ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:from-blue-500 hover:to-indigo-500' : 'border-gray-300 hover:bg-gray-50 text-gray-700'} transition-colors" aria-label={p.cta}>{p.cta}</button>
        </div>
      {/each}
    </div>
  </div>
</section>