<script>
  import ProductCard from './ProductCard.svelte';
  export let products = [];
</script>

<div class="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
  {#each products as p}
    <ProductCard {p} product={p} />
  {/each}
</div>