<script>
  import '../app.css';
  import '@fortawesome/fontawesome-free/css/all.min.css';
</script>

<main>
  <nav class="bg-gray-900 text-white px-4 py-2 flex items-center justify-between">
    <div class="font-bold text-lg">Constructor V3</div>
    <ul class="flex gap-6">
      <li><a href="/" class="hover:text-blue-400">Accueil</a></li>
      <li><a href="/supabase-test" class="hover:text-blue-400 bg-blue-600 px-2 py-1 rounded text-white">🧪 Test Supabase</a></li>
      <li><a href="/supabase-config" class="hover:text-blue-400">Configuration</a></li>
      <li><a href="/user" class="hover:text-blue-400">Utilisateur</a></li>
      <li><a href="/admin" class="hover:text-blue-400">Admin</a></li>
    </ul>
  </nav>
  <main class="bg-gray-50 min-h-screen">
    <slot />
  </main>
</main>