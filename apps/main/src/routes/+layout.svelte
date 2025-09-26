<script>
  import '../app.css';
  import '@fortawesome/fontawesome-free/css/all.min.css';
  import { supabase } from '$lib/supabase.js';
  import { onMount } from 'svelte';

  let session = null;
  let loadingSession = true;
  let isAdmin = false; // heuristique simple: email se terminant par 'admin' ou domain spécifique

  async function loadSession() {
    const { data: { session: s } } = await supabase.auth.getSession();
    session = s;
    loadingSession = false;
    if (session?.user?.email) {
      // règle provisoire: admin si email contient '+admin' ou se termine par '@admin.local'
      const email = session.user.email.toLowerCase();
      isAdmin = email.includes('+admin') || email.endsWith('@admin.local');
    }
  }

  onMount(async () => {
    await loadSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_evt, _sess) => {
      session = _sess; loadSession();
    });
  });

  async function logout() {
    await supabase.auth.signOut();
    session = null; isAdmin = false;
    window.location.href = '/auth';
  }

  function handleAuthNav() {
    if (!session) {
      window.location.href = '/auth';
      return;
    }
    // session existante => aller vers dashboard approprié
    window.location.href = isAdmin ? '/admin' : '/user';
  }
</script>

<main>
  <nav class="bg-gray-900 text-white px-4 py-2 flex items-center gap-8">
    <div class="font-bold text-lg tracking-wide flex items-center gap-2"><i class="fas fa-cubes text-blue-400"></i> Constructor V3</div>
    <ul class="flex gap-6 text-sm">
      <li><a href="/" class="hover:text-blue-400">Accueil</a></li>
      <li><a href="/user" class="hover:text-blue-400">Espace Utilisateur</a></li>
      <li><a href="/admin" class="hover:text-blue-400">Admin</a></li>
    </ul>
    <div class="ml-auto flex items-center gap-4">
      {#if loadingSession}
        <span class="text-xs text-gray-400 flex items-center gap-1"><i class="fas fa-spinner fa-spin"></i> Session...</span>
      {:else if !session}
        <button on:click={handleAuthNav} class="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium flex items-center gap-2">
          <i class="fas fa-right-to-bracket"></i> Login
        </button>
      {:else}
        <div class="flex items-center gap-3">
          <button on:click={handleAuthNav} class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium flex items-center gap-2">
            <i class="fas {isAdmin ? 'fa-shield-halved' : 'fa-user'}"></i>
            {isAdmin ? 'Admin' : 'Mon espace'}
          </button>
          <button on:click={logout} class="text-xs text-gray-300 hover:text-white flex items-center gap-1" title="Se déconnecter">
            <i class="fas fa-arrow-right-from-bracket"></i> Logout
          </button>
        </div>
      {/if}
    </div>
  </nav>
  <main class="bg-gray-50 min-h-screen">
    <slot />
  </main>
</main>