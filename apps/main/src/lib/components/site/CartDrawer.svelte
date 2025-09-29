<script>
  import { fly } from 'svelte/transition';

  import { cart } from '$lib/stores/cart.js';
  export let open = false;
  let unsub;
  let items = [];
  $: items = $cart.items;
  function remove(id){ cart.remove(id); }
  function clear(){ cart.clear(); }
</script>

{#if open}
  <div class="fixed inset-0 z-50" aria-modal="true" role="dialog">
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" on:click={() => open = false} role="button" tabindex="0" aria-label="Fermer le panier" on:keydown={(e)=> (e.key==='Enter'||e.key===' ') && (open=false)}></div>
    <aside class="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl flex flex-col" transition:fly={{ x: 40, duration: 200 }}>
      <div class="px-5 h-16 flex items-center justify-between border-b">
        <h2 class="font-semibold text-gray-800 flex items-center gap-2"><i class="fas fa-shopping-cart text-blue-600"></i> Panier</h2>
  <button class="text-gray-400 hover:text-gray-600" aria-label="Fermer" on:click={() => open = false}><i class="fas fa-times" aria-hidden="true"></i></button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        {#if items.length === 0}
          <p class="text-sm text-gray-500">Aucun article.</p>
        {:else}
          {#each items as it}
            <div class="flex items-center gap-3 border rounded-lg p-3">
              <img src={it.image} alt={it.title} class="w-16 h-16 object-cover rounded" loading="lazy" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{it.title}</p>
                <p class="text-xs text-gray-500">{it.price.toFixed(2)}€</p>
                <div class="flex items-center gap-2 mt-2 text-xs">
                  <button on:click={() => cart.decrement(it.id)} class="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">-</button>
                  <span>{it.qty}</span>
                  <button on:click={() => cart.increment(it.id)} class="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">+</button>
                </div>
              </div>
              <button on:click={() => remove(it.id)} class="text-gray-400 hover:text-red-500" aria-label="Supprimer l'article"><i class="fas fa-trash" aria-hidden="true"></i></button>
            </div>
          {/each}
        {/if}
      </div>
      <div class="border-t p-4 space-y-3">
        <div class="flex items-center justify-between text-sm">
          <span>Total</span>
          <span class="font-semibold">{$cart.total.toFixed(2)}€</span>
        </div>
        <button class="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50" disabled={items.length===0}>Commander</button>
        <button class="w-full py-2 rounded-lg bg-gray-100 text-gray-600 text-xs" on:click={clear}>Vider</button>
      </div>
    </aside>
  </div>
{/if}