<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  let form = { name:'', email:'', message:'' };
  let sending = false;
  async function submit() {
    if (!form.name || !form.email || !form.message) return;
    sending = true;
    await new Promise(r=>setTimeout(r,600));
    dispatch('submit', form);
    sending = false;
    form = { name:'', email:'', message:'' };
  }
</script>

<form class="space-y-5" on:submit|preventDefault={submit}>
  <div>
    <label for="cf_name" class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
    <input id="cf_name" class="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" bind:value={form.name} required />
  </div>
  <div>
    <label for="cf_email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
    <input id="cf_email" type="email" class="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" bind:value={form.email} required />
  </div>
  <div>
    <label for="cf_msg" class="block text-sm font-medium text-gray-700 mb-1">Message</label>
    <textarea id="cf_msg" rows="5" class="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" bind:value={form.message} required></textarea>
  </div>
  <button class="px-5 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:from-blue-500 hover:to-indigo-500 inline-flex items-center gap-2 disabled:opacity-50" disabled={sending}>
    {#if sending}<i class="fas fa-spinner fa-spin"></i>{:else}<i class="fas fa-paper-plane"></i>{/if}
    Envoyer
  </button>
</form>