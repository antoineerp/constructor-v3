<script>
  export let features = [
    { icon: 'fa-bolt', title: 'Rapide', text: 'Génération optimisée et cache intelligente.' },
    { icon: 'fa-shield-alt', title: 'Sécurisé', text: 'Respect des bonnes pratiques et isolation.' },
    { icon: 'fa-layer-group', title: 'Modulaire', text: 'Assemblez et réutilisez vos briques UI.' }
  ];
</script>

<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
  {#each features as f}
    <div class="p-6 rounded-xl border bg-white shadow-sm hover:shadow-md transition group">
      <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center mb-4 shadow">
        <i class={"fas "+f.icon}></i>
      </div>
      <h3 class="font-semibold text-gray-900 mb-2">{f.title}</h3>
      <p class="text-sm text-gray-600 leading-relaxed">{f.text}</p>
    </div>
  {/each}
</div>