<script>
	import { onMount } from 'svelte';
	import { componentsCatalog } from '$lib/catalog/components.js';
	import { dedupeComponents, lightweightHash } from '$lib/catalog/utils.js';

	// État général
	let activeTab = 'dashboard';
	let connectionStatus = { openai: 'unknown', claude: 'unknown', supabase: 'unknown' };
	let apiKeys = { openai: '', claude: '', supabase_url: '', supabase_anon: '' };

	// Templates
	let showTemplates = false;
	let templates = [];
	let tplLoading = false;
	let newTplName = '';
	let newTplDesc = '';
	let tplError = '';
	let editingTemplate = null;

	// Composants
	let showComponents = false;
	let rawComponents = componentsCatalog;
	let filtered = dedupeComponents(rawComponents).map(c => ({ ...c, hash: lightweightHash(c.code) }));
	let compSearch = '';
	let editingComponent = null;
	let newComponent = { name: '', filename: '', purpose: '', tags: '', code: '' };

	// Prompts personnalisés
	let customPrompts = [];
	let newPrompt = { name: '', category: 'component', content: '' };
	let editingPrompt = null;

	// Preview Template (SSR via endpoint compile/component)
	let previewOpen = false;
	let previewLoading = false;
	let previewUrl = '';
	let previewError = '';
	let previewAdvanced = false;
	let lastPreviewCode = '';
	let lastPreviewDependencies = {};
	const API_BASE = import.meta.env?.PUBLIC_MAIN_API_BASE || '';

	// Statistiques
	let stats = {
		totalProjects: 0,
		totalPrompts: 0,
		totalTemplates: 0,
		totalComponents: 0,
		totalCustomPrompts: 0
	};

	// Nouvelles fonctions
	// Vérification connexions
	async function checkConnections() {
		// Test OpenAI
		try {
			const res = await fetch('/api/openai/ping', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prompt: 'test' }) });
			const data = await res.json();
			connectionStatus.openai = data.success ? 'connected' : 'error';
		} catch {
			connectionStatus.openai = 'error';
		}

		// Test Supabase (si activé)
		try {
			const res = await fetch('/api/library');
			const data = await res.json();
			connectionStatus.supabase = data.success ? 'connected' : 'offline';
		} catch {
			connectionStatus.supabase = 'offline';
		}

		connectionStatus = { ...connectionStatus };
	}

	// Sauvegarde composant
	async function saveComponent(comp) {
		try {
			console.log('Saving component:', comp);
			// Mise à jour du catalogue local
			const index = rawComponents.findIndex(c => c.name === comp.name);
			if (index >= 0) {
				rawComponents[index] = { ...comp };
			} else {
				rawComponents = [...rawComponents, comp];
			}
			filterComponents();
			editingComponent = null;
		} catch (e) {
			alert('Erreur sauvegarde: ' + e.message);
		}
	}

	// Filtrage composants
	function filterComponents() {
		const q = compSearch.toLowerCase().trim();
		const base = dedupeComponents(rawComponents);
		let res = base;
		if (q) {
			res = base.filter(c => 
				c.name.toLowerCase().includes(q) || 
				c.purpose.toLowerCase().includes(q) || 
				c.tags.some(t => t.toLowerCase().includes(q))
			);
		}
		filtered = res.map(c => ({ ...c, hash: lightweightHash(c.code) }));
	}

	// Prompts personnalisés
	function addCustomPrompt() {
		if (!newPrompt.name.trim() || !newPrompt.content.trim()) return;
		
		customPrompts = [...customPrompts, {
			id: Date.now(),
			...newPrompt,
			created: new Date().toISOString()
		}];
		
		newPrompt = { name: '', category: 'component', content: '' };
		stats.totalCustomPrompts = customPrompts.length;
	}

	function deleteCustomPrompt(id) {
		if (confirm('Supprimer ce prompt ?')) {
			customPrompts = customPrompts.filter(p => p.id !== id);
			stats.totalCustomPrompts = customPrompts.length;
		}
	}

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

	let recentProjects = [];
	let popularPrompts = [];

	onMount(() => {
		checkConnections();
		loadTemplates();
		
		// Simulation du chargement des données
		stats = {
			totalProjects: 156,
			totalPrompts: 89,
			totalTemplates: templates.length || 23,
			totalComponents: filtered.length || 145,
			totalCustomPrompts: customPrompts.length
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
	<title>Constructor V3 - Administration</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Navigation -->
	<nav class="bg-white shadow-sm border-b">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center">
					<h1 class="text-xl font-bold text-gray-900">Constructor V3 - Admin</h1>
				</div>
				<div class="flex items-center space-x-4">
					<!-- Status connexions -->
					<div class="flex items-center gap-2 text-sm">
						<span class="w-2 h-2 rounded-full {connectionStatus.openai === 'connected' ? 'bg-green-500' : 'bg-red-500'}"></span>
						<span>OpenAI</span>
						<span class="w-2 h-2 rounded-full {connectionStatus.supabase === 'connected' ? 'bg-green-500' : connectionStatus.supabase === 'offline' ? 'bg-yellow-500' : 'bg-red-500'}"></span>
						<span>Supabase</span>
					</div>
					
					<div class="flex gap-2">
						<a href="/" class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm">💬 Chat</a>
						<a href="/generator" class="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">🏗️ Generator</a>
						<a href="/sandbox" class="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm">🛠️ Sandbox</a>
					</div>
				</div>
			</div>
		</div>
	</nav>

	<!-- Tabs -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<div class="border-b border-gray-200 mb-6">
			<nav class="-mb-px flex space-x-8">
				<button 
					class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'dashboard' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					on:click={() => activeTab = 'dashboard'}
				>
					📊 Dashboard
				</button>
				<button 
					class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'providers' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					on:click={() => activeTab = 'providers'}
				>
					🔑 Providers
				</button>
				<button 
					class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'components' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					on:click={() => activeTab = 'components'}
				>
					🧩 Composants
				</button>
				<button 
					class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'templates' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					on:click={() => activeTab = 'templates'}
				>
					📋 Templates
				</button>
				<button 
					class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'prompts' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					on:click={() => activeTab = 'prompts'}
				>
					💬 Prompts
				</button>
			</nav>
		</div>

		<!-- Dashboard Tab -->
		{#if activeTab === 'dashboard'}
			<div class="space-y-6">
				<!-- Stats Cards -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
					<div class="bg-white rounded-lg shadow p-6">
						<h3 class="text-sm font-medium text-gray-500">Projets</h3>
						<p class="text-3xl font-bold text-gray-900">{stats.totalProjects}</p>
					</div>
					<div class="bg-white rounded-lg shadow p-6">
						<h3 class="text-sm font-medium text-gray-500">Prompts</h3>
						<p class="text-3xl font-bold text-gray-900">{stats.totalPrompts}</p>
					</div>
					<div class="bg-white rounded-lg shadow p-6">
						<h3 class="text-sm font-medium text-gray-500">Templates</h3>
						<p class="text-3xl font-bold text-gray-900">{stats.totalTemplates}</p>
					</div>
					<div class="bg-white rounded-lg shadow p-6">
						<h3 class="text-sm font-medium text-gray-500">Composants</h3>
						<p class="text-3xl font-bold text-gray-900">{stats.totalComponents}</p>
					</div>
					<div class="bg-white rounded-lg shadow p-6">
						<h3 class="text-sm font-medium text-gray-500">Prompts Custom</h3>
						<p class="text-3xl font-bold text-gray-900">{stats.totalCustomPrompts}</p>
					</div>
				</div>

				<!-- Actions rapides -->
				<div class="bg-white rounded-lg shadow p-6">
					<h3 class="text-lg font-semibold mb-4">Actions rapides</h3>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
						<button 
							class="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
							on:click={() => activeTab = 'components'}
						>
							<div class="text-2xl mb-2">🧩</div>
							<div class="font-medium text-sm">Gérer Composants</div>
						</button>
						<button 
							class="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
							on:click={() => activeTab = 'templates'}
						>
							<div class="text-2xl mb-2">📋</div>
							<div class="font-medium text-sm">Créer Template</div>
						</button>
						<button 
							class="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
							on:click={() => activeTab = 'prompts'}
						>
							<div class="text-2xl mb-2">💬</div>
							<div class="font-medium text-sm">Ajouter Prompt</div>
						</button>
						<button 
							class="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors"
							on:click={checkConnections}
						>
							<div class="text-2xl mb-2">🔄</div>
							<div class="font-medium text-sm">Vérifier API</div>
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Providers Tab -->
		{#if activeTab === 'providers'}
			<div class="space-y-6">
				<!-- Stack UI Information -->
				<div class="bg-white rounded-lg shadow p-6">
					<h3 class="text-lg font-semibold mb-4">Sélection Automatique des Stacks UI</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="p-4 border rounded-lg">
							<h4 class="font-medium mb-2 flex items-center gap-2">
								<span class="w-3 h-3 rounded-full bg-blue-500"></span>
								Flowbite + Flowbite-Svelte
							</h4>
							<p class="text-sm text-gray-600 mb-2">Framework UI complet basé sur Tailwind CSS</p>
							<div class="text-xs text-gray-500 space-y-1">
								<div><strong>Cas d'usage:</strong> Applications business, dashboards, blogs professionnels</div>
								<div><strong>Points forts:</strong> Composants riches, accessibilité, documentation complète</div>
								<div><strong>Poids:</strong> +2 pour projets nécessitant rapidité de développement</div>
							</div>
						</div>
						
						<div class="p-4 border rounded-lg">
							<h4 class="font-medium mb-2 flex items-center gap-2">
								<span class="w-3 h-3 rounded-full bg-purple-500"></span>
								Skeleton UI
							</h4>
							<p class="text-sm text-gray-600 mb-2">Framework léger et moderne pour Svelte</p>
							<div class="text-xs text-gray-500 space-y-1">
								<div><strong>Cas d'usage:</strong> Applications créatives, portfolios, sites vitrines</div>
								<div><strong>Points forts:</strong> Léger, theming avancé, animations fluides</div>
								<div><strong>Poids:</strong> +1 pour projets axés design et performance</div>
							</div>
						</div>
						
						<div class="p-4 border rounded-lg">
							<h4 class="font-medium mb-2 flex items-center gap-2">
								<span class="w-3 h-3 rounded-full bg-green-500"></span>
								Tailwind CSS Pur
							</h4>
							<p class="text-sm text-gray-600 mb-2">Classes utilitaires sans framework additionnel</p>
							<div class="text-xs text-gray-500 space-y-1">
								<div><strong>Cas d'usage:</strong> Projets sur mesure, prototypes, composants uniques</div>
								<div><strong>Points forts:</strong> Flexibilité totale, contrôle fin, poids minimal</div>
								<div><strong>Poids:</strong> Par défaut si aucune préférence détectée</div>
							</div>
						</div>
						
						<div class="p-4 border rounded-lg">
							<h4 class="font-medium mb-2 flex items-center gap-2">
								<span class="w-3 h-3 rounded-full bg-yellow-500"></span>
								Méthode de Sélection
							</h4>
							<p class="text-sm text-gray-600 mb-2">IA analyse le prompt et calcule des scores</p>
							<div class="text-xs text-gray-500 space-y-1">
								<div><strong>Mots-clés:</strong> "blog rapide" → +2 Flowbite</div>
								<div><strong>Complexité:</strong> "dashboard entreprise" → +2 Flowbite</div>
								<div><strong>Design:</strong> "créatif, moderne" → +1 Skeleton</div>
								<div><strong>Résultat:</strong> Stack avec le score le plus élevé</div>
							</div>
						</div>
					</div>
				</div>
				
				<div class="bg-white rounded-lg shadow p-6">
					<h3 class="text-lg font-semibold mb-4">Configuration des Providers IA</h3>
					
					<div class="space-y-4">
						<!-- OpenAI -->
						<div class="border rounded-lg p-4">
							<div class="flex items-center justify-between mb-3">
								<h4 class="font-medium flex items-center gap-2">
									<span class="w-3 h-3 rounded-full {connectionStatus.openai === 'connected' ? 'bg-green-500' : 'bg-red-500'}"></span>
									OpenAI API
								</h4>
								<span class="text-sm text-gray-500">
									{connectionStatus.openai === 'connected' ? '✅ Connecté' : '❌ Non connecté'}
								</span>
							</div>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label for="openai-key" class="block text-sm font-medium text-gray-700 mb-1">Clé API</label>
									<input 
										id="openai-key"
										type="password" 
										bind:value={apiKeys.openai}
										placeholder="sk-..."
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
									/>
								</div>
								<div class="flex items-end">
									<button 
										class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
										on:click={checkConnections}
									>
										Tester la connexion
									</button>
								</div>
							</div>
						</div>

						<!-- Claude -->
						<div class="border rounded-lg p-4">
							<div class="flex items-center justify-between mb-3">
								<h4 class="font-medium flex items-center gap-2">
									<span class="w-3 h-3 rounded-full {connectionStatus.claude === 'connected' ? 'bg-green-500' : 'bg-red-500'}"></span>
									Claude API
								</h4>
								<span class="text-sm text-gray-500">
									{connectionStatus.claude === 'connected' ? '✅ Connecté' : '❌ Non connecté'}
								</span>
							</div>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label for="claude-key" class="block text-sm font-medium text-gray-700 mb-1">Clé API</label>
									<input 
										id="claude-key"
										type="password" 
										bind:value={apiKeys.claude}
										placeholder="sk-ant-..."
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
									/>
								</div>
								<div class="flex items-end">
									<button 
										class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
										on:click={checkConnections}
									>
										Tester la connexion
									</button>
								</div>
							</div>
						</div>

						<!-- Supabase -->
						<div class="border rounded-lg p-4">
							<div class="flex items-center justify-between mb-3">
								<h4 class="font-medium flex items-center gap-2">
									<span class="w-3 h-3 rounded-full {connectionStatus.supabase === 'connected' ? 'bg-green-500' : connectionStatus.supabase === 'offline' ? 'bg-yellow-500' : 'bg-red-500'}"></span>
									Supabase
								</h4>
								<span class="text-sm text-gray-500">
									{connectionStatus.supabase === 'connected' ? '✅ Connecté' : connectionStatus.supabase === 'offline' ? '⚠️ Offline' : '❌ Erreur'}
								</span>
							</div>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label for="supabase-url" class="block text-sm font-medium text-gray-700 mb-1">URL</label>
									<input 
										id="supabase-url"
										type="url" 
										bind:value={apiKeys.supabase_url}
										placeholder="https://xxx.supabase.co"
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
									/>
								</div>
								<div>
									<label for="supabase-anon" class="block text-sm font-medium text-gray-700 mb-1">Clé Anonyme</label>
									<input 
										id="supabase-anon"
										type="password" 
										bind:value={apiKeys.supabase_anon}
										placeholder="eyJ..."
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Composants Tab -->
		{#if activeTab === 'components'}
			<div class="space-y-6">
				<div class="bg-white rounded-lg shadow">
					<div class="px-6 py-4 border-b flex items-center justify-between">
						<h3 class="text-lg font-semibold">Gestion des Composants</h3>
						<div class="flex items-center gap-4">
							<input 
								type="text" 
								placeholder="Rechercher..." 
								bind:value={compSearch} 
								on:input={filterComponents}
								class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
							/>
							<span class="text-sm text-gray-500">{filtered.length} composants</span>
							<button 
								class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
								on:click={() => editingComponent = { ...newComponent }}
							>
								+ Nouveau
							</button>
						</div>
					</div>
					
					<div class="p-6">
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{#each filtered as comp}
								<div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
									<div class="flex items-start justify-between mb-2">
										<h4 class="font-medium text-sm">{comp.name}</h4>
										<div class="flex gap-1">
											<button 
												class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
												on:click={() => previewComponent(comp)}
											>
												👁️
											</button>
											<button 
												class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
												on:click={() => editingComponent = { ...comp }}
											>
												✏️
											</button>
										</div>
									</div>
									<p class="text-xs text-gray-600 mb-2">{comp.purpose}</p>
									<div class="flex flex-wrap gap-1 mb-2">
										{#each comp.tags as tag}
											<span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{tag}</span>
										{/each}
									</div>
									<p class="text-xs text-gray-400">{comp.filename}</p>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Templates Tab -->
		{#if activeTab === 'templates'}
			<div class="space-y-6">
				<div class="bg-white rounded-lg shadow p-6">
					<h3 class="text-lg font-semibold mb-4">Gestion des Templates</h3>
					
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<!-- Création -->
						<div class="space-y-4">
							<h4 class="font-medium">Créer un nouveau template</h4>
							<input 
								type="text" 
								placeholder="Nom du template" 
								bind:value={newTplName}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
							/>
							<textarea 
								placeholder="Description" 
								bind:value={newTplDesc}
								rows="3"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
							></textarea>
							<button 
								class="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
								on:click={createTemplate}
								disabled={!newTplName.trim()}
							>
								Créer Template
							</button>
							{#if tplError}
								<p class="text-sm text-red-600">{tplError}</p>
							{/if}
						</div>
						
						<!-- Liste -->
						<div class="md:col-span-2">
							{#if tplLoading}
								<p class="text-center text-gray-500">Chargement...</p>
							{:else if templates.length === 0}
								<p class="text-center text-gray-500">Aucun template</p>
							{:else}
								<div class="space-y-3">
									{#each templates as tpl}
										<div class="border rounded-lg p-4">
											<div class="flex items-start justify-between">
												<div class="flex-1">
													<h5 class="font-medium">{tpl.name}</h5>
													<p class="text-sm text-gray-600">{tpl.description}</p>
													<p class="text-xs text-gray-400 mt-1">
														Créé le {new Date(tpl.created_at).toLocaleDateString()}
													</p>
												</div>
												<div class="flex gap-2">
													<button 
														class="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
														on:click={() => previewTemplate(tpl, false)}
													>
														Voir Blueprint
													</button>
													<button 
														class="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
														on:click={() => editingTemplate = tpl}
													>
														Modifier
													</button>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Prompts Tab -->
		{#if activeTab === 'prompts'}
			<div class="space-y-6">
				<!-- Section sélection automatique UI Stack -->
				<div class="bg-white rounded-lg shadow p-6">
					<h3 class="text-lg font-semibold mb-4">Sélection Automatique de Stack UI</h3>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div class="space-y-4">
							<h4 class="font-medium">Stacks UI Disponibles</h4>
							
							<!-- Flowbite -->
							<div class="border rounded-lg p-4 bg-blue-50 border-blue-200">
								<div class="flex items-center gap-2 mb-2">
									<span class="w-3 h-3 bg-blue-600 rounded-full"></span>
									<h5 class="font-semibold text-blue-800">Flowbite</h5>
								</div>
								<p class="text-sm text-blue-700 mb-2">Composants prêts à l'emploi pour prototypage rapide</p>
								<div class="text-xs text-blue-600">
									<div><strong>Optimal pour :</strong> Blog, Landing pages, Prototypes</div>
									<div><strong>Avantages :</strong> Speed-first, Components riches</div>
								</div>
							</div>

							<!-- Skeleton -->
							<div class="border rounded-lg p-4 bg-purple-50 border-purple-200">
								<div class="flex items-center gap-2 mb-2">
									<span class="w-3 h-3 bg-purple-600 rounded-full"></span>
									<h5 class="font-semibold text-purple-800">Skeleton</h5>
								</div>
								<p class="text-sm text-purple-700 mb-2">Framework avec tokens de design avancés</p>
								<div class="text-xs text-purple-600">
									<div><strong>Optimal pour :</strong> Documentation, Theming avancé</div>
									<div><strong>Avantages :</strong> Design tokens, Thèmes multiples</div>
								</div>
							</div>

							<!-- Shadcn -->
							<div class="border rounded-lg p-4 bg-gray-50 border-gray-200">
								<div class="flex items-center gap-2 mb-2">
									<span class="w-3 h-3 bg-gray-600 rounded-full"></span>
									<h5 class="font-semibold text-gray-800">Shadcn</h5>
								</div>
								<p class="text-sm text-gray-700 mb-2">Composants copiables pour projets métier</p>
								<div class="text-xs text-gray-600">
									<div><strong>Optimal pour :</strong> Dashboard, SaaS, Formulaires complexes</div>
									<div><strong>Avantages :</strong> Copy-paste, Contrôle total du code</div>
								</div>
							</div>
						</div>

						<div class="md:col-span-2 space-y-4">
							<h4 class="font-medium">Algorithme de Sélection</h4>
							<div class="bg-gray-50 rounded-lg p-4 space-y-3">
								<div class="text-sm">
									<h5 class="font-semibold mb-2">Critères de décision :</h5>
									<ul class="space-y-1 text-xs text-gray-700">
										<li><strong>Type d'app :</strong> dashboard/saas → shadcn, blog → flowbite, docs → skeleton</li>
										<li><strong>Theming avancé :</strong> → skeleton (+3 points)</li>
										<li><strong>Formulaires complexes :</strong> → shadcn (+3 points)</li>
										<li><strong>Tables de données :</strong> → shadcn (+2 points)</li>
										<li><strong>Speed-first :</strong> → flowbite (+2 points)</li>
										<li><strong>Contrôle code :</strong> → shadcn (+2 points)</li>
									</ul>
								</div>
								<div class="border-t pt-3">
									<h5 class="font-semibold text-sm mb-2">Exemples de détection :</h5>
									<div class="grid grid-cols-1 gap-2 text-xs">
										<div class="bg-blue-100 p-2 rounded">
											<strong>"blog sur les chats"</strong> → Flowbite (+2 blog rapide)
										</div>
										<div class="bg-gray-100 p-2 rounded">
											<strong>"dashboard admin avec tables"</strong> → Shadcn (+3 dashboard +2 tables)
										</div>
										<div class="bg-purple-100 p-2 rounded">
											<strong>"docs avec thèmes multiples"</strong> → Skeleton (+3 docs +3 theming)
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-6">
					<h3 class="text-lg font-semibold mb-4">Prompts Personnalisés</h3>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Création -->
						<div class="space-y-4">
							<h4 class="font-medium">Ajouter un nouveau prompt</h4>
							<input 
								type="text" 
								placeholder="Nom du prompt" 
								bind:value={newPrompt.name}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
							/>
							<select 
								bind:value={newPrompt.category}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
							>
								<option value="component">Composant</option>
								<option value="site">Site complet</option>
								<option value="feature">Fonctionnalité</option>
								<option value="fix">Correction/Réparation</option>
							</select>
							<textarea 
								placeholder="Contenu du prompt..." 
								bind:value={newPrompt.content}
								rows="6"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
							></textarea>
							<button 
								class="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
								on:click={addCustomPrompt}
								disabled={!newPrompt.name.trim() || !newPrompt.content.trim()}
							>
								Ajouter Prompt
							</button>
						</div>
						
						<!-- Liste -->
						<div class="space-y-3">
							<h4 class="font-medium">Prompts existants ({customPrompts.length})</h4>
							{#each customPrompts as prompt}
								<div class="border rounded-lg p-3">
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<h5 class="font-medium text-sm">{prompt.name}</h5>
											<span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">{prompt.category}</span>
											<p class="text-xs text-gray-600 mt-2 line-clamp-3">{prompt.content}</p>
										</div>
										<div class="flex gap-1">
											<button 
												class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
												on:click={() => editingPrompt = prompt}
											>
												✏️
											</button>
											<button 
												class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
												on:click={() => deleteCustomPrompt(prompt.id)}
											>
												🗑️
											</button>
										</div>
									</div>
								</div>
							{:else}
								<p class="text-center text-gray-500">Aucun prompt personnalisé</p>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal d'édition composant -->
{#if editingComponent}
	<div class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
			<div class="px-6 py-4 border-b flex items-center justify-between">
				<h3 class="text-lg font-semibold">
					{editingComponent.name ? 'Modifier' : 'Créer'} Composant
				</h3>
				<button 
					class="text-gray-400 hover:text-gray-600"
					on:click={() => editingComponent = null}
				>
					✕
				</button>
			</div>
			
			<div class="p-6 overflow-y-auto max-h-96">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-4">
						<div>
							<label for="comp-name" class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
							<input 
								id="comp-name"
								type="text" 
								bind:value={editingComponent.name}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
							/>
						</div>
						<div>
							<label for="comp-filename" class="block text-sm font-medium text-gray-700 mb-1">Filename</label>
							<input 
								id="comp-filename"
								type="text" 
								bind:value={editingComponent.filename}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
							/>
						</div>
						<div>
							<label for="comp-purpose" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
							<textarea 
								id="comp-purpose"
								bind:value={editingComponent.purpose}
								rows="3"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
							></textarea>
						</div>
						<div>
							<label for="comp-tags" class="block text-sm font-medium text-gray-700 mb-1">Tags (séparés par virgule)</label>
							<input 
								id="comp-tags"
								type="text" 
								bind:value={editingComponent.tags}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
							/>
						</div>
					</div>
					<div>
						<label for="comp-code" class="block text-sm font-medium text-gray-700 mb-1">Code Svelte</label>
						<textarea 
							id="comp-code"
							bind:value={editingComponent.code}
							rows="12"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
							placeholder="Votre code Svelte ici..."
						></textarea>
					</div>
				</div>
			</div>
			
			<div class="px-6 py-4 border-t flex justify-end gap-3">
				<button 
					class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
					on:click={() => editingComponent = null}
				>
					Annuler
				</button>
				<button 
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					on:click={() => saveComponent(editingComponent)}
				>
					Sauvegarder
				</button>
				{#if editingComponent.code}
					<button 
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						on:click={() => previewComponent(editingComponent)}
					>
						Prévisualiser
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}


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
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
