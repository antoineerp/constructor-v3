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

	// Preview Template (SSR via endpoint compile/component)
	let previewOpen = false;
	let previewLoading = false;
	let previewUrl = '';
	let previewError = '';
	let previewAdvanced = false;
	let lastPreviewCode = '';
	let lastPreviewDependencies = {};
	const API_BASE = import.meta.env?.PUBLIC_MAIN_API_BASE || '';

	// Preview d'un composant individuel du catalogue
	async function previewComponent(comp){
		previewOpen = true; previewAdvanced = false; previewLoading = true; previewError=''; previewUrl='';
		try {
			let code = comp.code;
			// Si le snippet n'a pas de <script>, injecter un export minimal pour éviter heuristique vide
			if(!/<script[>\s]/.test(code)) code = `<script>export let props={};<\/script>\n`+code;
			const res = await fetch(`${API_BASE}/api/compile/component`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code, debug:false }) });
			const ct = res.headers.get('content-type')||'';
			if(!res.ok){
				if(ct.includes('application/json')){ const j= await res.json(); throw new Error(j.error||'Erreur compilation'); }
				throw new Error('HTTP '+res.status);
			}
			const html = await res.text();
			const blob = new Blob([html], { type:'text/html' });
			previewUrl = URL.createObjectURL(blob);
			lastPreviewCode = code; lastPreviewDependencies = {};
		} catch(e){ previewError = e.message; }
		finally { previewLoading = false; }
	}

	function closePreview(){
		previewOpen = false; previewUrl=''; previewError='';
	}

	async function previewTemplate(t, advanced=false){
		previewError=''; previewUrl=''; previewLoading=true; previewOpen=true; previewAdvanced = advanced;
		try {
			const bp = t.blueprint_json || {};
			const title = (bp.seo_meta?.title || t.name || 'Template Aperçu')+'';
			const encodedBlueprint = btoa(unescape(encodeURIComponent(JSON.stringify(bp))));
			let code='';
			let dependencies = {};
			if(!advanced){
				// Version simple (ancienne)
				const routeBlocks = Array.isArray(bp.routes) ? bp.routes.map(r=> {
					const p = (r.path||'/').replace(/`/g,'\\`');
					const d = (r.description||'').replace(/`/g,'\\`').replace(/</g,'&lt;');
					return `<div class=\\"border rounded p-2 mb-2 bg-gray-50\\"><code class=\\"text-xs text-gray-600\\">${p}</code><div class=\\"text-[11px] text-gray-500 mt-1\\">${d}</div></div>`;
				}).join('') : '';
				const safeTitle = title.replace(/`/g,'\\`');
				code = `<script>\nexport let blueprint = JSON.parse(atob('${encodedBlueprint}'));\n<\/script>\n<div class=\"p-4 font-sans text-sm space-y-3\">\n<h1 class=\"text-xl font-bold\">${safeTitle}</h1>\n${routeBlocks || '<div class=\\"text-[11px] text-gray-400\\">(Aucune route définie)</div>'}\n</div>`;
			} else {
				// Mode avancé : intégrer des composants dynamiques indiqués par blueprint.core_components
				const core = Array.isArray(bp.core_components)? bp.core_components.slice(0,12): [];
				// Construire index du catalog
				const catalogByName = new Map(componentsCatalog.map(c=> [c.name, c]));
				const selected = [];
				const blueprintCompMetadata = [];
				for(const item of core){
					let name = null; let props = {};
					if(typeof item === 'string') name = item; else if(item && typeof item === 'object'){ name = item.name || item.id || item.label; if(item.props && typeof item.props==='object') props = item.props; }
					if(!name) continue;
					const comp = catalogByName.get(name);
					if(comp){ selected.push(comp); blueprintCompMetadata.push({ name, props }); }
				}
				// Si rien trouvé, fallback sur 2 composants génériques du catalog (démo)
				if(!selected.length) selected.push(...componentsCatalog.slice(0,2));
				// Créer dépendances
				for(const comp of selected){
					let fname = comp.filename || (comp.name.replace(/[^A-Za-z0-9_]/g,'') + '.svelte');
					if(!/\.svelte$/.test(fname)) fname += '.svelte';
					const fullPath = `src/lib/preview/${fname}`;
					dependencies[fullPath] = comp.code;
				}
				// Imports
				const imports = Object.keys(dependencies).map(p=> {
					const base = p.split('/').pop().replace(/\.svelte$/,'');
					return `import ${base} from '${p}';`;
				}).join('\n');
				// Générer attributs dynamiques si présents dans blueprint
				function buildAttrString(props){
					const parts=[];
					for(const [k,v] of Object.entries(props||{})){
						if(v==null) continue;
						if(typeof v === 'string') parts.push(`${k}="${v.replace(/"/g,'&quot;')}"`);
						else if(typeof v === 'number' || typeof v === 'boolean') parts.push(`${k}={${v}}`);
						else parts.push(`${k}={${JSON.stringify(v)}}`);
					}
					return parts.join(' ');
				}
				const compsMarkup = Object.keys(dependencies).map(p=> {
					const base = p.split('/').pop().replace(/\.svelte$/,'');
					const meta = blueprintCompMetadata.find(m=> m.name===base) || blueprintCompMetadata.find(m=> m.name.toLowerCase()===base.toLowerCase());
					const attr = meta ? buildAttrString(meta.props) : '';
					return `<div class=\\"border rounded p-2 bg-white shadow-sm flex flex-col gap-1\\"><${base}${attr? ' '+attr:''} />${attr?`<code class=\\"text-[10px] text-gray-500\\">props: ${attr.replace(/{/g,'(').replace(/}/g,')')}</code>`:''}</div>`;
				}).join('\n');
				const routesBlock = Array.isArray(bp.routes) && bp.routes.length ? `<section class=\"space-y-1\"><h2 class=\"text-sm font-semibold text-gray-700\">Routes</h2>${bp.routes.map(r=> `<div class=\\"text-[11px] text-gray-600 border-b last:border-b-0 py-1\\"><code>${(r.path||'/').replace(/</g,'&lt;')}</code> ${(r.description||'').replace(/</g,'&lt;')}</div>`).join('')}</section>` : '<div class=\\"text-[11px] text-gray-400\\">(Aucune route)</div>';
				// Sections hero & features
				const hero = bp.hero && typeof bp.hero==='object' ? bp.hero : null;
				let heroBlock = '';
				if(hero){
					const hTitle = (hero.title||'').replace(/</g,'&lt;');
					const hSub = (hero.subtitle||'').replace(/</g,'&lt;');
					const cta = hero.cta && hero.cta.label ? `<a href=\\"${(hero.cta.href||'#').replace(/"/g,'&quot;')}\\" class=\\"inline-block mt-3 px-4 py-2 rounded bg-emerald-600 text-white text-xs font-medium\\">${hero.cta.label.replace(/</g,'&lt;')}</a>`:'';
					heroBlock = `<section class=\\"rounded-lg p-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white space-y-2\\"><h1 class=\\"text-2xl font-bold\\">${hTitle}</h1>${hSub?`<p class=\\"text-sm opacity-90\\">${hSub}</p>`:''}${cta}</section>`;
				}
				const features = Array.isArray(bp.features)? bp.features.slice(0,12): [];
				let featuresBlock = '';
				if(features.length){
					featuresBlock = `<section class=\\"space-y-3\\"><h2 class=\\"text-sm font-semibold text-gray-700\\">Features</h2><div class=\\"grid gap-3 md:grid-cols-2 lg:grid-cols-3\\">${features.map(f=> {
						const fTitle = (f.title||'').replace(/</g,'&lt;');
						const fDesc = (f.description||f.text||'').replace(/</g,'&lt;');
						return `<div class=\\"p-3 rounded border bg-white shadow-sm flex flex-col gap-1\\"><div class=\\"font-semibold text-[12px] text-gray-800\\">${fTitle}</div>${fDesc?`<div class=\\"text-[11px] text-gray-500 leading-snug\\">${fDesc}</div>`:''}</div>`;
					}).join('')}</div></section>`;
				}
				const pricingPlans = Array.isArray(bp.pricing?.plans)? bp.pricing.plans.slice(0,4): [];
				let pricingBlock='';
				if(pricingPlans.length){
					pricingBlock = `<section class=\\"space-y-4\\"><h2 class=\\"text-sm font-semibold text-gray-700\\">Pricing</h2><div class=\\"grid gap-4 md:grid-cols-${Math.min(2,pricingPlans.length)} lg:grid-cols-${Math.min(4,pricingPlans.length)}\\">${pricingPlans.map(pl=> {
						const name=(pl.name||pl.title||'Plan').replace(/</g,'&lt;');
						const price=(pl.price||pl.amount||pl.monthly||'').toString().replace(/</g,'&lt;');
						const desc=(pl.description||pl.subtitle||'').replace(/</g,'&lt;');
						const feats=Array.isArray(pl.features)? `<ul class=\\"mt-2 space-y-1 text-[11px] text-gray-600\\">${pl.features.slice(0,6).map(f=>`<li class=\\"flex items-start gap-1\\"><span class=\\"text-emerald-600 mt-0.5 fas fa-check text-[10px]\\"></span><span>${String(f).replace(/</g,'&lt;')}</span></li>`).join('')}</ul>`:'';
						return `<div class=\\"p-4 border rounded-lg bg-white shadow-sm flex flex-col\\"><h3 class=\\"font-semibold text-gray-800 text-sm\\">${name}</h3>${desc?`<p class=\\"text-[11px] text-gray-500 mt-0.5\\">${desc}</p>`:''}<div class=\\"mt-2 text-2xl font-bold text-gray-900\\">${price}</div>${feats}<a href=\\"#\\" class=\\"mt-auto inline-block px-3 py-1.5 rounded text-xs bg-gray-900 text-white hover:bg-gray-700\\">Choisir</a></div>`;
					}).join('')}</div></section>`;
				}
				const palette = bp.color_palette || {};
				const paletteCss = Object.entries(palette).map(([k,v])=> `--bp-${k}: ${String(v).replace(/`/g,'\\`')};`).join(' ');
				const safeTitle = title.replace(/`/g,'\\`');
				code = `<script>\nexport let blueprint = JSON.parse(atob('${encodedBlueprint}'));\n${imports}\n<\/script>\n<div class=\"p-5 font-sans text-sm space-y-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-full\" style=\"${paletteCss}\">\n${heroBlock}\n<header class=\"space-y-1\"><h1 class=\"text-2xl font-bold\">${safeTitle}</h1><p class=\"text-[12px] text-gray-500\">Prévisualisation avancée (démo)</p></header>\n${featuresBlock}\n${pricingBlock}\n<section class=\"grid gap-4 md:grid-cols-2 lg:grid-cols-3\">${compsMarkup}</section>\n${routesBlock}\n</div>`;
			}
			const body = { code, debug:false };
			if(advanced) body.strict = true;
			if(Object.keys(dependencies).length) body.dependencies = dependencies;
			const res = await fetch(`${API_BASE}/api/compile/component`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
			const ct = res.headers.get('content-type')||'';
			if(!res.ok){
				if(ct.includes('application/json')){ const j = await res.json(); throw new Error(j.error||'Erreur compilation'); }
				throw new Error('Erreur HTTP '+res.status);
			}
			const html = await res.text();
			const blob = new Blob([html], { type:'text/html' });
			previewUrl = URL.createObjectURL(blob);
			lastPreviewCode = code; lastPreviewDependencies = dependencies;
		} catch(e){
			previewError = e.message;
		} finally {
			previewLoading = false;
		}
	}

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
									<span class="flex items-center gap-2">
										<span class="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-700">{comp.tags.join(', ')}</span>
										<button class="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700" type="button" on:click={() => previewComponent(comp)}>Preview</button>
									</span>
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
											<div class="flex gap-2 mb-2">
												<button class="px-2 py-1 rounded bg-green-600 text-white text-[11px]" type="button" on:click={() => previewTemplate(t,false)}>Preview</button>
												<button class="px-2 py-1 rounded bg-emerald-600 text-white text-[11px]" type="button" on:click={() => previewTemplate(t,true)}>Avancé</button>
											</div>
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

{#if previewOpen}
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" tabindex="0" on:keydown={(e)=> e.key==='Escape' && closePreview()} on:click|self={closePreview}>
	<div class="bg-white rounded shadow-lg w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
		<div class="px-4 py-2 border-b flex items-center gap-3 text-sm">
			<strong>Prévisualisation Template</strong>
			{#if previewAdvanced}<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-medium">AVANCÉ</span>{/if}
			{#if previewLoading}<span class="text-xs text-gray-500 animate-pulse">Compilation…</span>{/if}
			{#if previewError}<span class="text-xs text-red-600">{previewError}</span>{/if}
			<button class="ml-auto text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300" on:click={closePreview}>Fermer</button>
			{#if previewUrl && !previewLoading}
				<button class="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700" on:click={() => {
					try {
						const payload = { mainCode: lastPreviewCode, deps: Object.entries(lastPreviewDependencies).map(([path,code])=>({ filename: path.split('/').pop(), code })) };
						localStorage.setItem('sandbox-svelte-v1', JSON.stringify(payload));
						window.open('/sandbox','_blank','noopener');
					} catch(e){ alert('Transfert sandbox impossible: '+e.message); }
				}}>Envoyer vers Sandbox</button>
			{/if}
		</div>
		<div class="flex-1 relative bg-gray-50">
			{#if previewUrl && !previewLoading}
				<iframe title="preview" src={previewUrl} class="absolute inset-0 w-full h-full bg-white border-0" sandbox="allow-scripts"></iframe>
			{:else}
				<div class="w-full h-full flex items-center justify-center text-xs text-gray-500">{previewError ? 'Erreur' : 'Compilation en cours…'}</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
	/* Styles Tailwind seront appliqués */
</style>