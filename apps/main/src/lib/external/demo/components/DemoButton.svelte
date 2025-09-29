<script>
  export let label = 'Demo';
  let count = 0;
  function inc(){ count++; }
</script>

<button class="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm flex items-center gap-2" on:click={inc}>
  <span>{label}</span>
  <span class="inline-block bg-white/20 rounded px-1 text-[10px]">{count}</span>
</button>

<style>
  button { transition: background .15s; }
</style>
