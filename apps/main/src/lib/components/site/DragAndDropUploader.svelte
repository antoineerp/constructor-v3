<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  export let multiple = true;
  let dragging = false;
  function handle(e){
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') dragging = true;
    if (e.type === 'dragleave') dragging = false;
    if (e.type === 'drop') {
      dragging = false;
      const files = Array.from(e.dataTransfer.files || []);
      dispatch('files', files);
    }
  }
  function pick(ev){
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      dispatch('files', files);
    };
    input.click();
  }
</script>

<div
  class="relative border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer select-none
  {dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'}"
  role="button"
  tabindex="0"
  aria-label="Zone de dépôt de fichiers"
  on:dragenter={handle}
  on:dragover={handle}
  on:dragleave={handle}
  on:drop={handle}
  on:click={pick}
  on:keydown={(e)=> (e.key==='Enter'||e.key===' ') && pick(e)}
>
  <div class="flex flex-col items-center gap-3">
    <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow">
      <i class="fas fa-cloud-arrow-up text-xl"></i>
    </div>
    <p class="text-sm font-medium text-gray-700">Glissez-déposez vos fichiers ici</p>
    <p class="text-xs text-gray-500">ou cliquez pour parcourir</p>
  </div>
</div>