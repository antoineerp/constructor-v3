<script>
  // Page d'accueil ultra simple pour vérifier que le rendu fonctionne.
  const message = 'Hello';
</script>

<div class="min-h-[60vh] flex flex-col items-center justify-center text-center gap-6 p-8">
  <h1 class="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 text-transparent bg-clip-text">{message} 👋</h1>
  <p class="text-gray-600 max-w-prose">
    Ceci est la page d'accueil minimale. Le rendu fonctionne. Vous pouvez maintenant demander à l'IA de générer des fichiers sans que l'UI de génération ne masque le test.
  </p>
  <a href="/generator" class="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition focus:outline-none focus:ring focus:ring-indigo-300">
    Accéder au générateur ↗
  </a>
</div>