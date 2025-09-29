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
	let globalCss = '';
	let cssHash = '';
	let guardMeta = null;
	let variantMeta = null;
	let showTech = false;
	let currentComponent = null;
	let iframeKey = 0;
	let autoRefresh = true;
	let intervalId;
	let sandboxEl; // iframe ref
		let routes = [];
		let selectedFile = '';
		let quality = null; let validationSummary = null; let qualityOpen = false;

	// Sandbox props (ex-exports du composant local)
	let sandboxCompiledModules = [];
	let sandboxEntry = '';
	let sandboxKey = 0;

	function currentProjectId(){
		const p = get(page);
		return p.url.searchParams.get('projectId') || '';
	}

		function currentModeParam(){
			const p = get(page);
			const m = (p.url.searchParams.get('mode')||'').toLowerCase();
			return ['inline','sandbox','ssr'].includes(m) ? m : null;
		}

		function updateUrlParam(param, value){
			try {
				const p = get(page);
				const url = new URL(p.url);
				if(value === null || value === undefined || value === '') url.searchParams.delete(param); else url.searchParams.set(param, value);
				history.replaceState({}, '', url.toString());
			} catch(_e){ /* ignore */ }
		}

		async function load(){
		projectId = currentProjectId();
		if(!projectId){ error = 'Paramètre ?projectId= manquant'; return; }
		loading = true; error='';
		try {
			if(mode === 'ssr'){
					const qs = selectedFile ? `?file=${encodeURIComponent(selectedFile)}` : '';
							const res = await fetch(`/api/projects/${projectId}/preview${qs}`);
				const data = await res.json();
				if(!data.success) throw new Error(data.error||'Erreur preview SSR');
							html = data.html; entry = data.entry; routes = data.routes || []; currentComponent = null; compiledModules = []; sandboxCompiledModules=[]; sandboxEntry=''; quality = data.quality; validationSummary = data.validation_summary;
			} else {
					const payload = selectedFile ? { file: selectedFile } : {};
					const res = await fetch(`/api/projects/${projectId}/compile`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
				const data = await res.json();
				if(!data.success) throw new Error(data.error||'Erreur compile');
							entry = data.entry; compiledModules = data.modules; routes = data.routes || []; quality = data.quality; validationSummary = data.validation_summary; globalCss = data.css || ''; cssHash = data.cssHash || ''; guardMeta = data.guardMeta || null; variantMeta = data.variantMeta || null;
				if(mode === 'inline'){
					const urlMap = new Map();
								// Préparer mapping imports => URL pour réécriture
								const pathToUrl = new Map();
					for(const m of compiledModules){
						if(m.error) continue;
						const blob = new Blob([m.jsCode], { type:'text/javascript' });
						const url = URL.createObjectURL(blob);
									pathToUrl.set(m.path, url);
					}
								// Réécriture des imports relatifs dans chaque module (simple replace)
								for(const m of compiledModules){
									if(!m.imports || !m.imports.length || m.error) continue;
									let code = m.jsCode;
									for(const imp of m.imports){
										const targetUrl = pathToUrl.get(imp.target);
										if(targetUrl){
											// Remplace uniquement occurrences exactes entre quotes
											const pattern = new RegExp(`(['"])${imp.spec.replace(/[-/\\.^$*+?()|[\]{}]/g,'\\$&')}\\1`, 'g');
											code = code.replace(pattern, `"${targetUrl}"`);
										}
									}
									if(code !== m.jsCode){
										const blob = new Blob([code], { type:'text/javascript' });
										const newUrl = URL.createObjectURL(blob);
										pathToUrl.set(m.path, newUrl);
									}
								}
								const entryUrl = pathToUrl.get(entry);
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
			const initialMode = currentModeParam();
			if(initialMode) mode = initialMode; // override default
			load();
		refreshLoop();
		return ()=> clearInterval(intervalId);
	});

		// Mise à jour URL quand le mode change (deep-link shareable)
		$: updateUrlParam('mode', mode);

	// Sandbox IIFE reactive effect
	$: if(sandboxEl && mode === 'sandbox' && sandboxCompiledModules && sandboxEntry){
		const doc = sandboxEl.contentDocument;
		doc.open();
		doc.write(`<!DOCTYPE html><html><head><meta charset=\"utf-8\" />\n<style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif;}\n${globalCss.replace(/<\/style>/g,'<\\/style>')}\n</style>\n</head><body><div id="app"></div><script>window.addEventListener('message', async (e)=>{ const { modules, entry }=e.data; const urlMap=new Map(); for(const m of modules){ if(m.error) continue; const blob=new Blob([m.jsCode],{type:'text/javascript'}); const u=URL.createObjectURL(blob); urlMap.set(m.path,u);} const entryUrl=urlMap.get(entry); if(entryUrl){ const mod=await import(entryUrl); new mod.default({ target: document.getElementById('app') }); } });<\/script></body></html>`);
		doc.close();
		setTimeout(()=> sandboxEl.contentWindow.postMessage({ modules: sandboxCompiledModules, entry: sandboxEntry }, '*'), 30);
	}

	// Injection CSS globale pour le mode inline (head du document parent)
	$: if(mode==='inline' && globalCss){
		if(typeof document!=='undefined'){
			let styleEl = document.getElementById('__preview-tailwind');
			if(!styleEl){
				styleEl = document.createElement('style');
				styleEl.id='__preview-tailwind';
				document.head.appendChild(styleEl);
			}
			if(styleEl.textContent !== globalCss){
				styleEl.textContent = globalCss;
			}
		}
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
		<div class="ml-auto flex items-center gap-2 text-xs">
			{#if mode!=='ssr'}
				<button class="px-2 py-1 rounded border bg-white hover:bg-gray-50" on:click={()=> showTech=!showTech}>{showTech? 'Fermer':'Tech'}</button>
			{/if}
		</div>
  </header>
  {#if error}
    <div class="p-4 text-sm text-red-600 bg-red-50 border-b">Erreur: {error}</div>
  {/if}
  <div class="flex-1 overflow-auto p-4">
		{#if mode!=='ssr' && !loading && globalCss===''}
			<div class="mb-3 text-[11px] px-3 py-2 rounded border border-amber-300 bg-amber-50 text-amber-700 flex items-start gap-2">
				<i class="fas fa-circle-exclamation mt-0.5"></i>
				<div>
					<p class="font-medium">Tailwind non compilé</p>
					<p class="leading-snug">Le CSS généré est vide. Vérifie présence de <code>src/app.css</code> & <code>tailwind.config.cjs</code>. (Le rendu inline/sandbox affichera seulement le HTML brut.)</p>
				</div>
			</div>
		{/if}
		{#if showTech && (guardMeta || variantMeta)}
			<div class="mb-4 border rounded bg-white shadow-sm p-3 text-[11px] space-y-3">
				<h2 class="font-semibold text-xs flex items-center gap-2"><i class="fas fa-microchip text-indigo-500"></i> Métadonnées techniques</h2>
				{#if cssHash}<div class="text-gray-600">CSS hash: <span class="font-mono">{cssHash.slice(0,12)}</span>{globalCss ? ` (${(globalCss.length/1024).toFixed(1)} Ko)` : ''}</div>{/if}
				{#if variantMeta}
					<div>
						<p class="font-medium mb-1">Variantes génération</p>
						<p class="mb-1">Sélection: <span class="font-mono text-indigo-600">{variantMeta.selected}</span></p>
						<ul class="space-y-1">
							{#each variantMeta.tried as v}
								<li class="border rounded px-2 py-1 flex justify-between gap-3 {v.variant===variantMeta.selected ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50'}">
									<span class="truncate">{v.variant}</span>
									<span class="text-gray-500">{v.durationMs} ms {v.schemaErrorsCount? ` • schemaErr:${v.schemaErrorsCount}`:''} {v.error? ' • fail':''}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if guardMeta}
					<div>
						<p class="font-medium mb-1">Guardrails</p>
						{#if guardMeta.ensure?.injected?.length}
							<p class="mb-1">Fichiers injectés: {guardMeta.ensure.injected.join(', ')}</p>
						{/if}
						<p class="text-gray-600">Corrections: alt+{guardMeta.summary.addedAlt} / hexFix {guardMeta.summary.tailwindHexFix} / imports dangereux {guardMeta.summary.strippedDangerous}</p>
					</div>
				{/if}
			</div>
		{/if}
		{#if quality}
			<div class="mb-4 border rounded bg-white shadow-sm">
				<button class="w-full flex items-center justify-between px-4 py-2 text-sm font-medium" on:click={()=> qualityOpen=!qualityOpen}>
					<span>Qualité: <span class="font-semibold">{quality.grade}</span> ({quality.score})</span>
					<span class="text-xs text-gray-500">{qualityOpen ? '▼' : '▲'}</span>
				</button>
				{#if qualityOpen}
					<div class="px-4 pb-4 space-y-3 text-xs">
						{#if quality.rationale && quality.rationale.length}
							<ul class="list-disc ml-5 marker:text-indigo-500">
								{#each quality.rationale as r}<li>{r}</li>{/each}
							</ul>
						{/if}
						{#if validationSummary}
							<div>
								<p class="font-semibold mb-1">Issues par fichier:</p>
								<div class="grid gap-1">
									{#each Object.entries(validationSummary) as [fname,count]}
										<button class="text-left hover:bg-indigo-50 px-2 py-1 rounded border text-[11px] flex justify-between" on:click={()=> { selectedFile=fname; load(); }}>
											<span class="truncate max-w-[240px]">{fname}</span>
											<span class="text-gray-500">{count}</span>
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
		{#if routes.length}
			<div class="mb-3 flex flex-wrap gap-2 text-xs">
				{#each routes as r}
					<button class="px-2 py-1 rounded border bg-white hover:bg-indigo-50 transition disabled:opacity-50" on:click={() => { selectedFile = r; load(); }} disabled={loading || selectedFile===r}>{r === selectedFile ? '●': '○'} {r.replace('src/routes/','')}</button>
				{/each}
				{#if selectedFile}
					<button class="px-2 py-1 rounded border bg-white text-red-600" on:click={() => { selectedFile=''; load(); }} disabled={loading}>Reset</button>
				{/if}
			</div>
		{/if}
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
				<div class="p-2 text-[11px] text-gray-500">Sandbox initialisation… modules envoyés à l'iframe ci-dessous.{#if !sandboxEntry || !sandboxCompiledModules.length} <span class="text-red-600">(Modules absents)</span>{/if}</div>
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