<script>let email=''; let submitted=false; function submit(){submitted=true;}</script>
<div class="bg-indigo-50 border border-indigo-100 rounded p-6 text-center max-w-xl mx-auto">
  <h3 class="text-lg font-semibold mb-2">Restez informé</h3>
  <p class="text-sm text-gray-600 mb-4">Actus produit, guides & mises à jour dans votre boîte mail.</p>
  {#if !submitted}
  <form on:submit|preventDefault={submit} class="flex flex-col sm:flex-row gap-2">
    <input type="email" bind:value={email} required placeholder="Votre email" class="flex-1 px-3 py-2 rounded border"/>
    <button class="px-4 py-2 rounded bg-indigo-600 text-white text-sm">S'inscrire</button>
  </form>
  {:else}
  <p class="text-sm text-green-600 font-medium">Merci ! Vérifiez votre email.</p>
  {/if}
</div>
