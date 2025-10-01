<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  // Redirection automatique vers le Studio unifié
  onMount(() => {
    goto('/studio');
  });
</script>

<svelte:head>
  <title>Constructor V3 - Redirection...</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="text-center">
    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
    <p class="text-gray-600">Redirection vers le Studio...</p>
  </div>
</div>
