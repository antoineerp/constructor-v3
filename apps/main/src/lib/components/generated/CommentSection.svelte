<script>
  export let comments = [
    { id: 1, author: 'Alex', text: 'Super article, merci !' },
    { id: 2, author: 'Nina', text: 'J\'adore ce modèle.' }
  ];
</script>
<section class="mt-12">
  <h2 class="text-xl font-semibold mb-4 flex items-center gap-2"><i class="fas fa-comments text-indigo-600"></i>Commentaires</h2>
  <div class="space-y-4">
    {#each comments as c}
      <div class="p-4 rounded border bg-white">
        <p class="text-sm text-gray-700"><span class="font-semibold">{c.author}</span> — {c.text}</p>
      </div>
    {/each}
  </div>
  <form class="mt-6 space-y-3">
    <textarea rows="3" placeholder="Votre commentaire" class="w-full px-3 py-2 border rounded focus:ring-indigo-500 focus:border-indigo-500 text-sm"></textarea>
    <button type="button" class="px-5 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">Envoyer</button>
  </form>
</section>
