<script>export let features=[{title:'Rapide',desc:'Optimisé pour le rendu SSR/edge.'},{title:'Modulaire',desc:'Composez des blocs adaptables.'},{title:'Automatisé',desc:'Réparations et normalisations intégrées.'},{title:'Extensible',desc:'Ajoutez vos propres composants.'}];</script>
<section class="py-12">
  <div class="max-w-5xl mx-auto px-4">
    <div class="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
      {#each features as f}
        <div class="p-4 border rounded bg-white shadow-sm">
          <h3 class="font-semibold mb-1">{f.title}</h3>
          <p class="text-sm text-gray-600 leading-snug">{f.desc}</p>
        </div>
      {/each}
    </div>
  </div>
</section>
