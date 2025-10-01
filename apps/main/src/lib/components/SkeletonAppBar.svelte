<script>
  import { AppBar } from '@skeletonlabs/skeleton';
  export let title = "Constructor V3";
  export let subtitle = "Skeleton UI Demo";
</script>

<AppBar background="bg-gradient-to-r from-primary-500 to-secondary-500" padding="p-4">
  <svelte:fragment slot="lead">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center">
        <i class="fas fa-cubes text-primary-500 text-xl"></i>
      </div>
      <div>
        <strong class="text-xl text-white">{title}</strong>
        <p class="text-xs text-white/80">{subtitle}</p>
      </div>
    </div>
  </svelte:fragment>
  
  <svelte:fragment slot="trail">
    <a href="/about" class="btn btn-sm variant-ghost-surface text-white hover:variant-soft-surface">
      <i class="fas fa-info-circle mr-2"></i>About
    </a>
    <a href="/docs" class="btn btn-sm variant-ghost-surface text-white hover:variant-soft-surface">
      <i class="fas fa-book mr-2"></i>Docs
    </a>
    <a href="/contact" class="btn btn-sm variant-filled text-white bg-white/20 hover:bg-white/30">
      <i class="fas fa-envelope mr-2"></i>Contact
    </a>
  </svelte:fragment>
</AppBar>
