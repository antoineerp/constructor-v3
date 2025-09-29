<script>
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
</header>
