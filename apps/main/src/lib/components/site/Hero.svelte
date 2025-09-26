<script>
  export let title = "Accélérez votre développement Svelte";
  export let subtitle = "Générez, composez et déployez des interfaces modernes appuyées par l'IA.";
  export let primary = { label: 'Commencer', href: '/signup' };
  export let secondary = { label: 'Documentation', href: '/docs' };
  export let image = 'https://picsum.photos/640/360';
</script>

<section class="relative overflow-hidden">
  <div class="absolute inset-0 -z-10" style="background: radial-gradient(circle at 20% 20%, rgba(99,102,241,0.25), transparent 70%);"></div>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 grid lg:grid-cols-2 gap-14 items-center">
    <div>
      <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight mb-6">
        <span class="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{title}</span>
      </h1>
      <p class="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">{subtitle}</p>
      <div class="flex flex-wrap gap-4">
        <a href={primary.href} class="px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:from-blue-500 hover:to-indigo-500 transition-colors">{primary.label}</a>
        <a href={secondary.href} class="px-6 py-3 rounded-xl text-sm font-semibold bg-white border shadow-sm text-gray-700 hover:border-gray-300">{secondary.label}</a>
      </div>
      <div class="mt-10 flex items-center gap-6 text-xs text-gray-500">
        <div class="flex items-center gap-2"><i class="fas fa-shield-alt text-blue-600"></i> Sécurisé</div>
        <div class="flex items-center gap-2"><i class="fas fa-bolt text-blue-600"></i> Rapide</div>
        <div class="flex items-center gap-2"><i class="fas fa-layer-group text-blue-600"></i> Modulaire</div>
      </div>
    </div>
    <div class="relative group">
      <div class="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 blur-2xl opacity-60 group-hover:opacity-80 transition"></div>
      <div class="relative rounded-2xl overflow-hidden ring-1 ring-black/10 shadow-2xl">
        <img src={image} alt="Illustration" class="w-full h-full object-cover" loading="lazy" />
      </div>
    </div>
  </div>
</section>