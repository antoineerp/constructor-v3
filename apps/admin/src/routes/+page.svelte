<script>
	import { onMount } from 'svelte';
	import { componentsCatalog } from '$lib/catalog/components.js';
	import { dedupeComponents, lightweightHash } from '$lib/catalog/utils.js';

	let showComponents = false;
	let showTemplates = false;
	let templates = [];
	let tplLoading = false;
	let newTplName = '';
	let newTplDesc = '';
	let tplError = '';

	async function loadTemplates(){
		try {
			tplLoading = true; tplError='';
			const res = await fetch('/api/templates');
			const data = await res.json();
			if(!data.success) throw new Error(data.error||'échec chargement');
			templates = data.templates||[];
		} catch(e){ tplError = e.message; }
		finally { tplLoading=false; }
	}

	async function createTemplate(){
		if(!newTplName.trim()) return; tplError='';
		try {
			const res = await fetch('/api/templates', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name:newTplName.trim(), description:newTplDesc.trim(), catalogSnapshot: { summary: 'auto', count: filtered.length } }) });
			const data = await res.json(); if(!data.success) throw new Error(data.error||'échec création');
			templates = [data.template, ...templates]; newTplName=''; newTplDesc='';
		} catch(e){ tplError = e.message; }
	}

	function toggleTemplates(){ showTemplates = !showTemplates; if(showTemplates && templates.length===0) loadTemplates(); }
	let rawComponents = componentsCatalog;
	let filtered = dedupeComponents(rawComponents).map(c => ({ ...c, hash: lightweightHash(c.code) }));
	let compSearch = '';

	function filterComponents(){
		const q = compSearch.toLowerCase().trim();
		const base = dedupeComponents(rawComponents);
		let res = base;
		if(q){
			res = base.filter(c => c.name.toLowerCase().includes(q) || c.purpose.toLowerCase().includes(q) || c.tags.some(t=> t.toLowerCase().includes(q)));
		}
		filtered = res.map(c => ({ ...c, hash: lightweightHash(c.code) }));
	}

	async function importExternalCatalog(url){
		// Téléchargement JSON attendu: [{name, filename, purpose, tags[], code}]
		try {
			const r = await fetch(url);
			if(!r.ok) throw new Error('HTTP '+r.status);
			const data = await r.json();
			if(!Array.isArray(data)) throw new Error('Format catalogue invalide');
			rawComponents = dedupeComponents([...rawComponents, ...data.filter(d => d && d.name && d.filename && d.code)]);
			filterComponents();
		} catch(e){
			alert('Import échoué: '+ e.message);
		}
	}
	
	let stats = {
		totalProjects: 0,
		totalPrompts: 0,
		totalTemplates: 0,
		totalComponents: 0
	};

	let recentProjects = [];
	let popularPrompts = [];

	onMount(() => {
		// Simulation du chargement des données
		stats = {
			totalProjects: 156,
			totalPrompts: 89,
			totalTemplates: 23,
			totalComponents: 145
		};

		recentProjects = [
			{ id: 1, name: "E-commerce Vêtements", user: "user@example.com", created: "2025-09-25" },
			{ id: 2, name: "CRM Entreprise", user: "admin@company.com", created: "2025-09-24" },
			{ id: 3, name: "Portfolio Designer", user: "designer@studio.com", created: "2025-09-23" }
		];

		popularPrompts = [
			{ prompt: "site e-commerce", usage: 45 },
			{ prompt: "tableau de bord admin", usage: 32 },
			{ prompt: "portfolio créatif", usage: 28 },
			{ prompt: "CRM client", usage: 21 }
		];
	});
</script>

<svelte:head>
	<title>Constructor V3 - Dashboard Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-100">
	<!-- Navigation -->
	<nav class="bg-white shadow-sm border-b">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center">
					<h1 class="text-xl font-bold text-gray-900">Constructor V3 Admin</h1>
				</div>
				<div class="flex items-center space-x-4">
					<button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
						Nouveau Template
					</button>
				</div>
			</div>
		</div>
	</nav>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
		<!-- Stats Cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-sm font-medium text-gray-500">Total Projets</h3>
				<p class="text-3xl font-bold text-gray-900">{stats.totalProjects}</p>
			</div>
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-sm font-medium text-gray-500">Total Prompts</h3>
				<p class="text-3xl font-bold text-gray-900">{stats.totalPrompts}</p>
			</div>
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-sm font-medium text-gray-500">Total Templates</h3>
				<p class="text-3xl font-bold text-gray-900">{stats.totalTemplates}</p>
			</div>
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-sm font-medium text-gray-500">Total Composants</h3>
				<p class="text-3xl font-bold text-gray-900">{stats.totalComponents}</p>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Recent Projects -->
			<div class="bg-white rounded-lg shadow">
				<div class="px-6 py-4 border-b">
					<h2 class="text-lg font-semibold text-gray-900">Projets Récents</h2>
				</div>
				<div class="p-6">
					<div class="space-y-4">
						{#each recentProjects as project}
							<div class="flex items-center justify-between py-2 border-b border-gray-100">
								<div>
									<p class="font-medium text-gray-900">{project.name}</p>
									<p class="text-sm text-gray-500">{project.user}</p>
								</div>
								<span class="text-sm text-gray-400">{project.created}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Popular Prompts -->
			<div class="bg-white rounded-lg shadow">
				<div class="px-6 py-4 border-b">
					<h2 class="text-lg font-semibold text-gray-900">Prompts Populaires</h2>
				</div>
				<div class="p-6">
					<div class="space-y-4">
						{#each popularPrompts as item}
							<div class="flex items-center justify-between">
								<span class="text-gray-900">{item.prompt}</span>
								<div class="flex items-center">
									<span class="text-sm text-gray-500 mr-2">{item.usage} fois</span>
									<div class="w-24 bg-gray-200 rounded-full h-2">
										<div 
											class="bg-blue-500 h-2 rounded-full" 
											style="width: {(item.usage / 50) * 100}%"
										></div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- Management Sections -->
		<div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
			<div class="bg-white rounded-lg shadow p-6 flex flex-col">
				<h3 class="text-lg font-semibold mb-2 flex items-center gap-2"><i class="fas fa-layer-group text-green-500"></i>Templates</h3>
				<p class="text-gray-600 text-sm mb-4 flex-1">Structures réutilisables (blueprint + composants).</p>
				<button class="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded" on:click={toggleTemplates}>{showTemplates ? 'Masquer' : 'Afficher'}</button>
			</div>
			<div class="bg-white rounded-lg shadow p-6 flex flex-col">
				<h3 class="text-lg font-semibold mb-2">Composants validés</h3>
				<p class="text-gray-600 text-sm mb-4 flex-1">Liste des composants réutilisables proposés à l'IA.</p>
				<button class="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded" on:click={() => showComponents = !showComponents}>{showComponents ? 'Masquer' : 'Afficher'}</button>
			</div>
			<div class="bg-white rounded-lg shadow p-6 flex flex-col">
				<h3 class="text-lg font-semibold mb-2">Prompts / Analyse</h3>
				<p class="text-gray-600 text-sm mb-4 flex-1">Analyse des prompts les plus utilisés (WIP).</p>
				<button class="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled>À venir</button>
			</div>
		</div>

		{#if showComponents}
			<section class="mt-10 bg-white rounded-lg shadow border">
				<header class="px-6 py-4 border-b flex items-center gap-4">
					<h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2"><i class="fas fa-puzzle-piece text-purple-500"></i> Composants disponibles pour l'IA</h2>
					<div class="ml-auto flex items-center gap-2">
						<input type="text" placeholder="Filtrer..." bind:value={compSearch} on:input={filterComponents} class="px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-purple-500" />
						<span class="text-xs text-gray-500">{filtered.length} / {rawComponents.length}</span>
					</div>
				</header>
				<div class="px-6 pt-4 flex gap-2 items-center text-[11px] text-gray-600">
					<input id="catalogUrl" placeholder="URL catalogue externe (JSON)" class="flex-1 px-3 py-1.5 border rounded focus:ring-2 focus:ring-purple-500" />
					<button class="px-3 py-1.5 bg-purple-600 text-white rounded" on:click={() => { const u = document.getElementById('catalogUrl').value.trim(); if(u) importExternalCatalog(u); }}>Importer</button>
				</div>
				<div class="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
					{#each filtered as comp}
						<div class="border rounded-lg p-4 bg-gradient-to-br from-gray-50 to-white flex flex-col">
							<div class="flex items-center justify-between mb-2">
								<h3 class="font-semibold text-gray-800 text-sm">{comp.name}</h3>
								<span class="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-700">{comp.tags.join(', ')}</span>
							</div>
							<p class="text-gray-600 text-xs mb-3 leading-relaxed line-clamp-3">{comp.purpose}</p>
							<div class="flex items-center justify-between text-[10px] text-gray-400 mb-1">
								<span class="truncate">{comp.filename}</span>
								<span title="Hash du code">{comp.hash}</span>
							</div>
							<div class="mt-auto">
								<details class="group">
									<summary class="cursor-pointer text-[11px] text-indigo-600 hover:underline flex items-center gap-1"><i class="fas fa-code"></i>Voir code</summary>
									<div class="mt-2 space-y-1">
										<div class="flex items-center justify-between text-[10px] text-gray-500">
											<span>{comp.filename}</span>
											<button type="button" class="text-indigo-600 hover:underline" on:click={() => navigator.clipboard.writeText(comp.code)}>Copier</button>
										</div>
										<pre class="bg-gray-900 text-[10px] text-gray-100 p-2 rounded overflow-auto max-h-48 whitespace-pre">{comp.code}</pre>
									</div>
								</details>
							</div>
						</div>
					{:else}
						<p class="text-gray-500 col-span-full text-sm">Aucun composant.</p>
					{/each}
				</div>
			</section>
		{/if}

		{#if showTemplates}
			<section class="mt-10 bg-white rounded-lg shadow border">
				<header class="px-6 py-4 border-b flex items-center gap-4">
					<h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2"><i class="fas fa-layer-group text-green-500"></i> Templates</h2>
				</header>
				<div class="p-6 space-y-6">
					<div class="grid md:grid-cols-3 gap-4 text-sm">
						<div class="md:col-span-1 flex flex-col gap-2">
							<input placeholder="Nom du template" bind:value={newTplName} class="px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 focus:outline-none" />
							<textarea rows="3" placeholder="Description" bind:value={newTplDesc} class="px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"></textarea>
							<button class="py-2 rounded bg-green-600 text-white text-sm font-medium disabled:opacity-50" disabled={!newTplName.trim()} on:click={createTemplate}>Créer</button>
							{#if tplError}<div class="text-xs text-red-600">{tplError}</div>{/if}
						</div>
						<div class="md:col-span-2">
							{#if tplLoading}
								<p class="text-gray-500 text-sm">Chargement…</p>
							{:else if templates.length===0}
								<p class="text-gray-500 text-sm">Aucun template enregistré.</p>
							{:else}
								<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
									{#each templates as t}
										<div class="border rounded p-3 bg-gradient-to-br from-gray-50 to-white flex flex-col text-xs">
											<h3 class="font-semibold text-gray-800 mb-1 flex items-center gap-2"><i class="fas fa-layer-group text-green-500"></i>{t.name}</h3>
											<p class="text-gray-600 line-clamp-3 mb-2">{t.description}</p>
											<details class="mt-auto group">
												<summary class="cursor-pointer text-[11px] text-green-600 hover:underline flex items-center gap-1"><i class="fas fa-eye"></i> Blueprint</summary>
												<div class="mt-2 space-y-1">
													<button class="text-[10px] text-green-700 hover:underline" type="button" on:click={() => navigator.clipboard.writeText(JSON.stringify(t.blueprint_json||{}, null, 2))}>Copier JSON</button>
													<pre class="bg-gray-900 text-[10px] text-gray-100 p-2 rounded overflow-auto max-h-56 whitespace-pre">{JSON.stringify(t.blueprint_json||{}, null, 2)}</pre>
												</div>
											</details>
											<span class="mt-2 text-[10px] text-gray-400">#{t.id} · {new Date(t.created_at).toLocaleDateString()}</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</section>
		{/if}
	</main>
</div>

<style>
	/* Styles Tailwind seront appliqués */
</style>