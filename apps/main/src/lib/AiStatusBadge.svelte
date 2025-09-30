<script>
  export let providers = {};
  export let loading = false;
  $: total = Object.values(providers).filter(Boolean).length;
  $: cls = total ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300';
</script>
<div class={`inline-flex items-center gap-1 text-xs px-2 py-1 border rounded ${cls}`}> 
  <span class="w-2 h-2 rounded-full animate-pulse" class:bg-green-500={total} class:bg-red-500={!total}></span>
  <span>AI: {loading? '...' : (total? total+' ok' : 'aucune')}</span>
</div>
<style>
  .bg-green-500{ background:#16a34a }
  .bg-red-500{ background:#dc2626 }
</style>
