<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';

	let projectId = '';
	let loading = false;
	let error = '';
	// Modes
	let html = '';
	let entry = '';
	let mode = 'inline'; // 'inline' | 'sandbox' | 'ssr'
	let compiledModules = [];
	let currentComponent = null;
	let iframeKey = 0;
	let autoRefresh = true;
	let intervalId;
	let sandboxEl; // iframe ref

	// Sandbox props (ex-exports du composant local)
	let sandboxCompiledModules = [];
	let sandboxEntry = '';
	let sandboxKey = 0;

	function currentProjectId(){
		const p = get(page);
		return p.url.searchParams.get('projectId') || '';
	}

	async function load(){
		projectId = currentProjectId();
		if(!projectId){ error = 'Paramètre ?projectId= manquant'; return; }
		loading = true; error='';
		try {
			if(mode === 'ssr'){
				const res = await fetch(`/api/projects/${projectId}/preview`);
				const data = await res.json();
				if(!data.success) throw new Error(data.error||'Erreur preview SSR');
				html = data.html; entry = data.entry; currentComponent = null; compiledModules = []; sandboxCompiledModules=[]; sandboxEntry='';
			} else {
				const res = await fetch(`/api/projects/${projectId}/compile`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) });
				const data = await res.json();
				if(!data.success) throw new Error(data.error||'Erreur compile');
				entry = data.entry; compiledModules = data.modules;
				if(mode === 'inline'){
					const urlMap = new Map();
					for(const m of compiledModules){
						if(m.error) continue;
						const blob = new Blob([m.jsCode], { type:'text/javascript' });
						const url = URL.createObjectURL(blob);
						urlMap.set(m.path, url);
					}
					const entryUrl = urlMap.get(entry);
					if(entryUrl){
						const mod = await import(/* @vite-ignore */ entryUrl);
						currentComponent = mod.default;
						html = '';
					}
					setTimeout(()=>{ for(const u of urlMap.values()) URL.revokeObjectURL(u); }, 60_000);
				} else if(mode === 'sandbox') {
					// Prépare sandbox data
					sandboxCompiledModules = compiledModules;
					sandboxEntry = entry;
					sandboxKey += 1; // force recréation iframe
					html = ''; currentComponent = null;
				}
			}
		} catch(e){ error = e.message; }
		loading = false;
	}

	function refreshLoop(){
		clearInterval(intervalId);
		if(autoRefresh){ intervalId = setInterval(load, 4000); }
	}

	onMount(()=> {
		load();
		refreshLoop();
		return ()=> clearInterval(intervalId);
	});

	// Sandbox IIFE reactive effect
	$: if(sandboxEl && mode === 'sandbox' && sandboxCompiledModules && sandboxEntry){
		const doc = sandboxEl.contentDocument;
		doc.open();
		doc.write(`<!DOCTYPE html><html><head><meta charset=\"utf-8\" />\n<style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif;}/* Tailwind global */</style>\n</head><body><div id="app"></div><script>window.addEventListener('message', async (e)=>{ const { modules, entry }=e.data; const urlMap=new Map(); for(const m of modules){ if(m.error) continue; const blob=new Blob([m.jsCode],{type:'text/javascript'}); const u=URL.createObjectURL(blob); urlMap.set(m.path,u);} const entryUrl=urlMap.get(entry); if(entryUrl){ const mod=await import(entryUrl); new mod.default({ target: document.getElementById('app') }); } });<\/script></body></html>`);
		doc.close();
		setTimeout(()=> sandboxEl.contentWindow.postMessage({ modules: sandboxCompiledModules, entry: sandboxEntry }, '*'), 30);
	}
</script>

<svelte:head>
	<title>Constructor V3 - Preview</title>
</svelte:head>

<main class="h-screen flex flex-col bg-gray-100 text-gray-800">
	<header class="px-4 py-3 border-b bg-white flex flex-wrap gap-4 items-center">
    <h1 class="font-semibold">Preview Génération</h1>
    <div class="flex items-center gap-2 text-sm">
      <label class="flex items-center gap-1 cursor-pointer select-none">
        <input type="checkbox" bind:checked={autoRefresh} on:change={refreshLoop} /> Auto-refresh
      </label>
      <button class="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs" on:click={load} disabled={loading}>Reload</button>
      {#if projectId}<span class="text-xs text-gray-500">projectId={projectId}</span>{/if}
    </div>
		<div class="flex items-center gap-2 text-xs">
			<label class="flex items-center gap-1">
				<input type="radio" name="mode" value="inline" bind:group={mode} on:change={load}/> inline
			</label>
			<label class="flex items-center gap-1">
				<input type="radio" name="mode" value="sandbox" bind:group={mode} on:change={load}/> sandbox
			</label>
			<label class="flex items-center gap-1">
				<input type="radio" name="mode" value="ssr" bind:group={mode} on:change={load}/> ssr
			</label>
		</div>
  </header>
  {#if error}
    <div class="p-4 text-sm text-red-600 bg-red-50 border-b">Erreur: {error}</div>
  {/if}
  <div class="flex-1 overflow-auto p-4">
    {#if loading}
      <div class="flex items-center gap-3 text-sm text-gray-600"><div class="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div> Chargement...</div>
		{:else if mode==='ssr' && html}
      <div class="rounded border bg-white shadow-sm">
        <div class="px-3 py-2 text-xs border-b flex justify-between items-center bg-gray-50">
          <span>Entrée: {entry}</span>
          <span class="text-gray-500">(SSR static HTML – Tailwind classes visibles)</span>
        </div>
        <div class="p-4 space-y-4">
          {@html html}
        </div>
      </div>
		{:else if mode==='inline' && currentComponent}
			<div class="rounded border bg-white shadow-sm p-2">
				<div class="px-3 py-2 text-xs border-b bg-gray-50 flex justify-between items-center">
					<span>{entry}</span><span class="text-gray-500">inline (hydraté)</span>
				</div>
				<div class="p-4">
					<svelte:component this={currentComponent} />
				</div>
			</div>
		{:else if mode==='sandbox'}
			<div class="rounded border bg-white shadow-sm">
				<div class="px-3 py-2 text-xs border-b bg-gray-50 flex justify-between items-center">
					<span>{entry}</span><span class="text-gray-500">iframe sandbox</span>
				</div>
				<Sandbox {compiledModules} {entry} key={iframeKey} />
			</div>
    {:else}
      <p class="text-sm text-gray-500 italic">Aucun HTML disponible.</p>
    {/if}
  </div>
</main>
{#key sandboxKey}
  {#if mode==='sandbox'}
	<iframe title="Sandbox Preview" class="w-full min-h-[70vh] bg-white" sandbox="allow-scripts" referrerpolicy="no-referrer" this={sandboxEl}></iframe>
  {/if}
{/key}

<style>
	/* Styles spécifiques preview (placeholder si besoin futur) */
</style>