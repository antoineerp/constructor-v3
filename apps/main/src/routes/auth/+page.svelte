<script>
  import { onMount } from 'svelte';

  import { supabase } from '$lib/supabase.js';
  let mode = 'login'; // 'login' | 'signup'
  let email = '';
  let password = '';
  let loading = false;
  let message = '';
  let errorMsg = '';

  async function submit() {
    errorMsg=''; message='';
    if(!email || !password) { errorMsg='Email et mot de passe requis.'; return; }
    loading = true;
    // Sans Supabase : simple redirection après pseudo validation
    setTimeout(()=> { window.location.href='/user'; }, 300);
    loading = false;
  }

  onMount(async ()=>{
     // Supabase retiré : aucune session
  });
</script>

<svelte:head><title>Auth - Constructor V3</title></svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 px-4 py-10">
  <div class="w-full max-w-md bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 shadow-xl text-white">
    <h1 class="text-2xl font-bold mb-6 flex items-center gap-2"><i class="fas fa-user-shield text-indigo-300"></i> {mode==='login' ? 'Connexion' : 'Créer un compte'}</h1>
    <form on:submit|preventDefault={submit} class="space-y-5">
      <div>
        <label for="auth_email" class="block text-sm mb-1 font-medium">Email</label>
        <input id="auth_email" type="email" class="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-white/50" bind:value={email} placeholder="you@example.com" />
      </div>
      <div>
        <label for="auth_password" class="block text-sm mb-1 font-medium">Mot de passe</label>
        <input id="auth_password" type="password" class="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-white/50" bind:value={password} placeholder="••••••••" />
      </div>
      <button type="submit" class="w-full py-2.5 rounded-lg font-semibold bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 disabled:opacity-50 flex items-center justify-center gap-2" disabled={loading}>
        {#if loading}<i class="fas fa-spinner fa-spin"></i>{/if}
        {mode==='login' ? 'Se connecter' : 'Créer le compte'}
      </button>
    </form>
    {#if errorMsg}<div class="mt-4 text-sm text-red-300 bg-red-900/40 border border-red-600/40 px-3 py-2 rounded">{errorMsg}</div>{/if}
    {#if message}<div class="mt-4 text-sm text-emerald-200 bg-emerald-900/30 border border-emerald-500/30 px-3 py-2 rounded">{message}</div>{/if}
    <div class="mt-6 text-xs flex items-center justify-between">
      <button class="underline text-indigo-300 hover:text-indigo-200" on:click={()=> mode = mode==='login' ? 'signup' : 'login'}>
        {mode==='login' ? "Créer un compte" : "J'ai déjà un compte"}
      </button>
      <a class="text-indigo-300 hover:text-indigo-200" href="/">Retour accueil</a>
    </div>
  </div>
</div>

<style>
  :global(body) { font-family: system-ui, Roboto, sans-serif; }
</style>