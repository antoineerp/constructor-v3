<script>
  import { onMount } from 'svelte';
  export let items = [
    { quote: 'Outil incroyable – gains de temps massifs.', author: 'Marie', role: 'CTO' },
    { quote: 'Nous prototypons 5x plus vite.', author: 'Lucas', role: 'Lead Dev' },
    { quote: 'Qualité de code vraiment propre.', author: 'Fatima', role: 'Product Engineer' }
  ];
  let index = 0;
  let interval;
  onMount(()=>{ interval = setInterval(()=> index = (index + 1) % items.length, 4500); return ()=> clearInterval(interval); });
</script>

<div class="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur border shadow">
  <div class="p-10 min-h-[220px] flex flex-col items-center text-center transition">
    <div class="text-xl text-gray-800 font-medium leading-relaxed max-w-2xl">
      “{items[index].quote}”
    </div>
    <div class="mt-6 text-sm font-semibold text-gray-900">{items[index].author}</div>
    <div class="text-xs text-gray-500">{items[index].role}</div>
    <div class="flex gap-2 mt-6">
      {#each items as _, i}
        <span class="w-2 h-2 rounded-full {i === index ? 'bg-blue-600' : 'bg-gray-300'}"></span>
      {/each}
    </div>
  </div>
</div>