<script>
  import { cart } from '$lib/stores/cart.js';
  export let product = { id: 1, title: 'Produit', price: 49, image: 'https://picsum.photos/400/300', badge: 'Nouveau', description: 'Description brève.' };
  function add() { cart.add(product); }
</script>

<div class="group relative bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col">
  <div class="relative">
    <img src={product.image} alt={product.title} class="w-full h-48 object-cover" loading="lazy" />
    {#if product.badge}
      <span class="absolute top-3 left-3 text-[10px] uppercase tracking-wide font-semibold bg-blue-600 text-white px-2 py-1 rounded-md shadow">{product.badge}</span>
    {/if}
    <button on:click={add} class="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md text-xs font-medium shadow hover:bg-white flex items-center gap-1">
      <i class="fas fa-cart-plus text-blue-600"></i> Ajouter
    </button>
  </div>
  <div class="p-4 flex flex-col flex-1">
    <h3 class="font-semibold text-gray-900 mb-1 line-clamp-1">{product.title}</h3>
    <p class="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>
    <div class="mt-auto flex items-center justify-between">
      <span class="text-lg font-bold text-gray-900">{product.price.toFixed(2)}€</span>
      <button on:click={add} class="text-xs font-semibold text-blue-600 hover:text-blue-700">Ajouter</button>
    </div>
  </div>
</div>

<style>
  .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .line-clamp-1 { display:-webkit-box; -webkit-line-clamp:1; line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
</style>