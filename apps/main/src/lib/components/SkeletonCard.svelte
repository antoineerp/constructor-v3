<script>
  export let title = "Beautiful Card";
  export let description = "This is a stunning card component built with Skeleton UI and Tailwind CSS.";
  export let image = "https://images.unsplash.com/photo-1557683316-973673baf926?w=800";
  export let tags = ["Skeleton", "Tailwind", "Svelte"];
</script>

<div class="card overflow-hidden hover:scale-105 transition-transform duration-300">
  <!-- Image header -->
  <header class="card-header p-0">
    <img 
      src={image} 
      alt={title}
      class="w-full h-48 object-cover"
    />
  </header>
  
  <!-- Content -->
  <section class="card-body p-6 space-y-4">
    <h3 class="h3 font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
      {title}
    </h3>
    <p class="text-surface-600">{description}</p>
    
    <!-- Tags -->
    <div class="flex flex-wrap gap-2">
      {#each tags as tag}
        <span class="badge variant-soft-primary">{tag}</span>
      {/each}
    </div>
  </section>
  
  <!-- Footer avec actions -->
  <footer class="card-footer flex justify-between items-center p-4 border-t border-surface-300">
    <button class="btn variant-ghost-surface">
      <i class="fas fa-heart mr-2"></i>Like
    </button>
    <button class="btn variant-filled-primary">
      <i class="fas fa-arrow-right mr-2"></i>Learn More
    </button>
  </footer>
</div>
