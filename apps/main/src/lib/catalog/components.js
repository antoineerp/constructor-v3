// Catalogue de composants "validés" réutilisables par l'IA
// Chaque entrée peut être référencée dans les prompts pour forcer la génération à importer
// plutôt que dupliquer du markup.

export const componentsCatalog = [
  {
    name: 'HeaderPro',
    filename: 'src/lib/components/HeaderPro.svelte',
    purpose: 'Barre de navigation sticky avec logo et menu responsive',
    tags: ['layout','navigation','branding'],
    code: `<script>
  export let title = 'Le Blog des Motos';
  let open = false;
</script>
<header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
  <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
    <div class="flex items-center gap-2 font-semibold text-indigo-600">
      <i class="fas fa-motorcycle"></i>
      <span>{title}</span>
    </div>
    <nav class="hidden md:flex gap-6 text-sm">
      <a href="/" class="hover:text-indigo-600">Accueil</a>
      <a href="/articles" class="hover:text-indigo-600">Articles</a>
      <a href="/contact" class="hover:text-indigo-600">Contact</a>
    </nav>
    <button class="md:hidden p-2" on:click={() => open = !open} aria-label="Menu mobile">
      <i class="fas {open ? 'fa-xmark' : 'fa-bars'}"></i>
    </button>
  </div>
  {#if open}
    <div class="md:hidden border-t bg-white px-4 py-3 space-y-2 text-sm">
      <a href="/" class="block">Accueil</a>
      <a href="/articles" class="block">Articles</a>
      <a href="/contact" class="block">Contact</a>
    </div>
  {/if}
</header>`
  },
  {
    name: 'KpiCards',
    filename: 'src/lib/components/KpiCards.svelte',
    purpose: 'Groupe de cartes KPI (CRM / Analytics)',
    tags: ['dashboard','analytics','crm'],
    code: `<script>export let kpis=[{label:'Clients',value:128},{label:'MRR',value:'3.4k€'},{label:'Churn',value:'2.1%'},{label:'Conversion',value:'12%'}];</script>
<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {#each kpis as k}
  <div class="rounded-lg border bg-white shadow-sm p-4 flex flex-col">
    <span class="text-xs uppercase tracking-wide text-slate-500">{k.label}</span>
    <span class="mt-2 text-xl font-semibold text-slate-800">{k.value}</span>
  </div>
 {/each}
</div>`
  },
  {
    name: 'SalesChart',
    filename: 'src/lib/components/SalesChart.svelte',
    purpose: 'Placeholder graphique ventes (sans dépendance)',
    tags: ['analytics','chart','crm'],
    code: `<script>export let data=[12,19,8,15,22,17,25];</script>
<div class="p-4 rounded-lg border bg-white shadow-sm">
  <h3 class="text-sm font-medium mb-3">Evolution des ventes (mock)</h3>
  <div class="h-32 relative flex items-end gap-1">
    {#each data as v,i}
      <div class="bg-indigo-500/70 hover:bg-indigo-500 transition-colors w-full rounded-t" style=\"height:{5+v}px\" title=\"Mois {i+1}: {v}\"></div>
    {/each}
    <div class="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(to_top,transparent,transparent_7px,rgba(0,0,0,0.05)_8px)]"></div>
  </div>
</div>`
  },
  {
    name: 'DataTable',
    filename: 'src/lib/components/DataTable.svelte',
    purpose: 'Table générique triable (mock)',
    tags: ['table','data','crm','data_table'],
    code: `<script>
  export let rows=[{name:'Acme',mrr:1200,status:'Actif'},{name:'Globex',mrr:560,status:'Actif'},{name:'Initech',mrr:300,status:'Churn'},{name:'Umbrella',mrr:980,status:'Actif'}];
  let sortKey='name'; let asc=true;
  $: sorted = [...rows].sort((a,b)=> (a[sortKey]>b[sortKey]?1:-1)*(asc?1:-1));
  function sort(k){ if(sortKey===k) asc=!asc; else {sortKey=k; asc=true;} }
</script>
<table class="w-full text-sm">
  <thead class="bg-slate-50 text-slate-600 text-xs">
    <tr>
      <th class="p-2 text-left cursor-pointer" on:click={()=>sort('name')}>Client</th>
      <th class="p-2 text-left cursor-pointer" on:click={()=>sort('mrr')}>MRR</th>
      <th class="p-2 text-left">Statut</th>
    </tr>
  </thead>
  <tbody>
    {#each sorted as r}
    <tr class="border-b last:border-0 hover:bg-slate-50">
      <td class="p-2">{r.name}</td>
      <td class="p-2 font-mono">{r.mrr} €</td>
      <td class="p-2"><span class="px-2 py-0.5 rounded bg-slate-200 text-xs">{r.status}</span></td>
    </tr>
    {/each}
  </tbody>
</table>`
  },
  {
    name: 'CustomerList',
    filename: 'src/lib/components/CustomerList.svelte',
    purpose: 'Liste clients cliquable',
    tags: ['crm','list'],
    code: `<script>export let customers=[{id:'c1',name:'Acme SA',value:1200},{id:'c2',name:'Globex',value:560},{id:'c3',name:'Initech',value:300}];</script>
<ul class="divide-y rounded border bg-white shadow-sm">
 {#each customers as c}
  <li class="p-3 flex items-center justify-between hover:bg-slate-50">
    <a class="font-medium text-sm" href={'/clients/'+c.id}>{c.name}</a>
    <span class="text-xs text-slate-500">{c.value} €</span>
  </li>
 {/each}
</ul>`
  },
  {
    name: 'CustomerDetail',
    filename: 'src/lib/components/CustomerDetail.svelte',
    purpose: 'Fiche client simple (mock)',
    tags: ['crm','detail'],
    code: `<script>export let customer={id:'c1',name:'Acme SA',lifetime:4200,notes:['Appel le 12/09','Demande démo']};</script>
<div class="rounded-lg border bg-white shadow-sm p-4 space-y-3">
  <div class="flex items-center justify-between">
    <h2 class="font-semibold text-lg">{customer.name}</h2>
    <span class="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">ID {customer.id}</span>
  </div>
  <div class="text-sm text-slate-600">Valeur vie: <strong>{customer.lifetime} €</strong></div>
  <div>
    <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Notes</h3>
    <ul class="text-xs list-disc ml-5 space-y-0.5">
      {#each customer.notes as n}<li>{n}</li>{/each}
    </ul>
  </div>
</div>`
  },
  // ====== PACK NAVIGATION ======
  {
    name: 'SidebarCollapsible',
    filename: 'src/lib/components/SidebarCollapsible.svelte',
    purpose: 'Sidebar collapsible avec sections et état actif',
    tags: ['navigation','sidebar','layout'],
    code: `<script>export let items=[{label:'Dashboard',icon:'fa-gauge',href:'#'},{label:'Articles',icon:'fa-newspaper',href:'#'},{label:'Statistiques',icon:'fa-chart-line',href:'#'}]; let open=true;</script>
<aside class="bg-gray-900 text-gray-200 w-64 transition-all duration-300" class:!w-16={!open}>
  <div class="h-14 flex items-center justify-between px-4 border-b border-gray-800">
    <span class="font-semibold text-sm truncate">Panneau</span>
    <button class="text-xs px-2 py-1 bg-gray-800 rounded" on:click={() => open=!open}>{open?'−':'+'}</button>
  </div>
  <nav class="py-3 space-y-1">
    {#each items as it}
      <a href={it.href} class="flex items-center gap-3 px-4 py-2 text-xs hover:bg-gray-800 rounded">
        <i class={'fas '+it.icon+' w-4'}></i><span class="truncate" class:hidden={!open}>{it.label}</span>
      </a>
    {/each}
  </nav>
</aside>`
  },
  {
    name: 'MegaMenu',
    filename: 'src/lib/components/MegaMenu.svelte',
    purpose: 'Menu horizontal avec panneau méga-catégories',
    tags: ['navigation','menu'],
    code: `<script>let open=false; export let groups=[{title:'Catégories',links:['Roadsters','Trail','Sport','Vintage']},{title:'Services',links:['Entretien','Assurance','Financement']}];</script>
<div class="relative bg-white border-b">
  <div class="max-w-7xl mx-auto px-6 flex h-14 items-center gap-8">
    <a href="/" class="font-semibold text-indigo-600">MotoBlog</a>
    <button class="text-sm hover:text-indigo-600" on:click={()=>open=!open}>Explorer <i class="fas fa-angle-down ml-1"></i></button>
  </div>
  {#if open}
    <div class="absolute inset-x-0 top-full bg-white shadow-xl border-t py-8">
      <div class="max-w-7xl mx-auto px-8 grid md:grid-cols-3 gap-10 text-sm">
        {#each groups as g}
          <div>
            <h4 class="font-semibold text-gray-900 mb-3">{g.title}</h4>
            <ul class="space-y-1">
              {#each g.links as l}
                <li><a href="#" class="text-gray-600 hover:text-indigo-600">{l}</a></li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>`
  },
  // ====== PACK FORMULAIRES ======
  {
    name: 'FormContactPro',
    filename: 'src/lib/components/FormContactPro.svelte',
    purpose: 'Formulaire de contact accessible avec validation minimale UI',
    tags: ['form','contact'],
    code: `<script>let data={name:'',email:'',message:''}; let sent=false; function submit(){sent=true;}</script>
<form on:submit|preventDefault={submit} class="space-y-4 max-w-lg">
  <div>
    <label class="block text-sm font-medium mb-1">Nom</label>
    <input bind:value={data.name} required class="w-full px-3 py-2 border rounded focus:ring-indigo-500 focus:border-indigo-500" />
  </div>
  <div>
    <label class="block text-sm font-medium mb-1">Email</label>
    <input type="email" bind:value={data.email} required class="w-full px-3 py-2 border rounded focus:ring-indigo-500 focus:border-indigo-500" />
  </div>
  <div>
    <label class="block text-sm font-medium mb-1">Message</label>
    <textarea rows="4" bind:value={data.message} required class="w-full px-3 py-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"></textarea>
  </div>
  <button class="px-5 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">Envoyer</button>
  {#if sent}<p class="text-green-600 text-sm mt-2">Message simulé envoyé.</p>{/if}
</form>`
  },
  {
    name: 'FormNewsletter',
    filename: 'src/lib/components/FormNewsletter.svelte',
    purpose: 'Formulaire email compact pour inscription newsletter',
    tags: ['form','newsletter'],
    code: `<script>let email=''; let ok=false; function sub(){ok=true;}</script>
<form on:submit|preventDefault={sub} class="flex gap-2">
  <input type="email" bind:value={email} placeholder="Votre email" class="flex-1 px-3 py-2 border rounded focus:ring-indigo-500 focus:border-indigo-500" required />
  <button class="px-4 py-2 bg-indigo-600 text-white rounded text-sm">OK</button>
  {#if ok}<span class="text-green-600 text-xs self-center">Merci !</span>{/if}
</form>`
  },
  // ====== PACK UI ACTIONS ======
  {
    name: 'DropdownMenu',
    filename: 'src/lib/components/DropdownMenu.svelte',
    purpose: 'Petit menu déroulant accessible basique',
    tags: ['menu','dropdown','interaction'],
    code: `<script>let open=false; export let label='Options'; export let items=['Action 1','Action 2'];</script>
<div class="relative inline-block text-left">
  <button class="px-3 py-1.5 bg-gray-900 text-white rounded text-xs" on:click={()=>open=!open}>{label} <i class="fas fa-angle-down ml-1"></i></button>
  {#if open}
    <div class="absolute right-0 mt-1 w-40 bg-white border rounded shadow text-xs z-10">
      {#each items as it}
        <button class="w-full text-left px-3 py-2 hover:bg-gray-50">{it}</button>
      {/each}
    </div>
  {/if}
</div>`
  },
  {
    name: 'TabsBasic',
    filename: 'src/lib/components/TabsBasic.svelte',
    purpose: 'Système d’onglets simple',
    tags: ['tabs','navigation'],
    code: `<script>export let tabs=['Infos','Détails','FAQ']; let active=0;</script>
<div class="border-b flex gap-4 text-sm">
  {#each tabs as t,i}
    <button class="py-2 -mb-px border-b-2" class:border-indigo-600={i===active} class:text-indigo-600={i===active} on:click={()=>active=i}>{t}</button>
  {/each}
</div>
<div class="p-4 text-sm text-gray-600">Contenu: {tabs[active]}</div>`
  },
  // ====== PACK DATA ======
  {
    name: 'TableSortable',
    filename: 'src/lib/components/TableSortable.svelte',
    purpose: 'Table triable client side (mock)',
    tags: ['table','data'],
    code: `<script>let rows=[{name:'Honda',year:2023},{name:'Yamaha',year:2022},{name:'Ducati',year:2024}]; let asc=true; function sort(){asc=!asc; rows=rows.slice().sort((a,b)=> asc? a.year-b.year : b.year-a.year);}</script>
<table class="w-full text-sm">
  <thead class="bg-gray-100 text-gray-600">
    <tr><th class="p-2 text-left">Marque</th><th class="p-2 text-left cursor-pointer" on:click={sort}>Année <i class="fas fa-sort"></i></th></tr>
  </thead>
  <tbody>
    {#each rows as r}
      <tr class="border-b"><td class="p-2">{r.name}</td><td class="p-2">{r.year}</td></tr>
    {/each}
  </tbody>
</table>`
  },
  {
    name: 'StatCards',
    filename: 'src/lib/components/StatCards.svelte',
    purpose: 'Groupe de statistiques KPIs',
    tags: ['stats','dashboard'],
    code: `<script>export let metrics=[{label:'Lecteurs',value:1250,delta:'+4%'},{label:'Articles',value:48,delta:'+2'},{label:'Commentaires',value:320,delta:'+12'}];</script>
<div class="grid sm:grid-cols-3 gap-4">
  {#each metrics as m}
    <div class="p-4 border rounded bg-white shadow-sm">
      <p class="text-xs text-gray-500">{m.label}</p>
      <p class="text-xl font-semibold">{m.value}</p>
      <p class="text-[11px] text-green-600">{m.delta}</p>
    </div>
  {/each}
</div>`
  },
  // ====== PACK INTERACTION ======
  {
    name: 'DragList',
    filename: 'src/lib/components/DragList.svelte',
    purpose: 'Liste drag & drop simplifiée (simulation sans lib externe)',
    tags: ['drag','interaction'],
    code: `<script>let items=['A','B','C','D']; let draggingIndex=null; function onDragStart(e,i){draggingIndex=i; e.dataTransfer.effectAllowed='move';} function onDragOver(e,i){e.preventDefault(); if(draggingIndex===null||draggingIndex===i) return; const clone=items.slice(); const el=clone.splice(draggingIndex,1)[0]; clone.splice(i,0,el); items=clone; draggingIndex=i;} </script>
<ul class="space-y-2 text-sm">
  {#each items as it,i}
    <li draggable on:dragstart={(e)=>onDragStart(e,i)} on:dragover={(e)=>onDragOver(e,i)} class="px-3 py-2 rounded border bg-white cursor-move flex items-center gap-2"><i class="fas fa-grip-lines"></i>{it}</li>
  {/each}
</ul>`
  },
  // ====== PACK ECOM/BLOG ======
  {
    name: 'PricingTable',
    filename: 'src/lib/components/PricingTable.svelte',
    purpose: 'Table de pricing 3 colonnes',
    tags: ['pricing','commerce'],
    code: `<script>let plans=[{name:'Starter',price:'0€',features:['Basique','Communauté']},{name:'Pro',price:'19€',features:['Tout Starter','Analytics','Priorité']},{name:'Ultimate',price:'49€',features:['Tout Pro','Support 24/7']}];</script>
<div class="grid md:grid-cols-3 gap-6">
  {#each plans as p}
    <div class="border rounded-lg p-6 bg-white shadow-sm flex flex-col">
      <h3 class="font-semibold mb-1">{p.name}</h3>
      <p class="text-2xl font-bold mb-4">{p.price}</p>
      <ul class="text-xs text-gray-600 space-y-1 mb-4">{#each p.features as f}<li class="flex items-center gap-2"><i class="fas fa-check text-green-500"></i>{f}</li>{/each}</ul>
      <button class="mt-auto py-2 rounded bg-indigo-600 text-white text-sm">Choisir</button>
    </div>
  {/each}
</div>`
  },
  // ====== PACK LAYOUT ======
  {
    name: 'DashboardShell',
    filename: 'src/lib/components/DashboardShell.svelte',
    purpose: 'Shell de tableau de bord combinant sidebar + zone de contenu',
    tags: ['layout','dashboard'],
    code: `<script>import SidebarCollapsible from './SidebarCollapsible.svelte';</script>
<div class="flex min-h-[60vh]">
  <SidebarCollapsible />
  <div class="flex-1 p-6 bg-gray-50">Slot contenu dashboard…</div>
</div>`
  },
  {
    name: 'FooterPro',
    filename: 'src/lib/components/FooterPro.svelte',
    purpose: 'Pied de page simple avec liens réseaux sociaux',
    tags: ['layout'],
    code: `<footer class="mt-16 bg-gray-900 text-gray-300 text-sm">
  <div class="max-w-7xl mx-auto px-4 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
    <div>
      <h3 class="font-semibold text-white mb-2">À propos</h3>
      <p class="text-gray-400 leading-relaxed">Blog passionné dédié aux motos, à la mécanique et à la culture deux‑roues.</p>
    </div>
    <div>
      <h3 class="font-semibold text-white mb-2">Navigation</h3>
      <ul class="space-y-1">
        <li><a href="/" class="hover:text-white">Accueil</a></li>
        <li><a href="/articles" class="hover:text-white">Articles</a></li>
        <li><a href="/contact" class="hover:text-white">Contact</a></li>
      </ul>
    </div>
    <div>
      <h3 class="font-semibold text-white mb-2">Réseaux</h3>
      <div class="flex gap-3 text-lg">
        <a href="#" aria-label="Twitter" class="hover:text-white"><i class="fab fa-x-twitter"></i></a>
        <a href="#" aria-label="Instagram" class="hover:text-white"><i class="fab fa-instagram"></i></a>
        <a href="#" aria-label="YouTube" class="hover:text-white"><i class="fab fa-youtube"></i></a>
      </div>
    </div>
    <div>
      <h3 class="font-semibold text-white mb-2">Newsletter</h3>
      <form class="space-y-2">
        <input type="email" placeholder="Email" class="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:outline-none" />
        <button class="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm">S'abonner</button>
      </form>
    </div>
  </div>
  <div class="border-t border-gray-800 text-center py-4 text-xs text-gray-500">© {new Date().getFullYear()} Blog Motos. Tous droits réservés.</div>
</footer>`
  },
  {
    name: 'HeroSplit',
    filename: 'src/lib/components/HeroSplit.svelte',
    purpose: 'Section hero deux colonnes avec CTA',
    tags: ['hero','marketing'],
    code: `<section class="relative overflow-hidden py-16 md:py-24 bg-gradient-to-br from-indigo-50 to-white">
  <div class="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
    <div>
      <h1 class="text-3xl md:text-5xl font-extrabold leading-tight mb-6"><span class="text-indigo-600">Passion & Performance</span> sur Deux Roues</h1>
      <p class="text-gray-600 mb-6 text-lg">Actus, revues de modèles, préparation, accessoires et conseils d'entretien pour vivre la moto intensément.</p>
      <div class="flex flex-wrap gap-4">
        <a href="/articles" class="px-6 py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow">Lire les articles</a>
        <a href="/contact" class="px-6 py-3 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-medium">Nous contacter</a>
      </div>
    </div>
    <div class="relative">
      <div class="aspect-[4/3] rounded-xl bg-gray-200 overflow-hidden shadow-lg ring-1 ring-gray-300">
        <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=870&q=60" alt="Moto" class="w-full h-full object-cover" />
      </div>
    </div>
  </div>
</section>`
  },
  {
    name: 'ArticleCardPro',
    filename: 'src/lib/components/ArticleCardPro.svelte',
    purpose: 'Carte article avec image, titre, excerpt et lien',
    tags: ['card','article'],
    code: `<script>export let article;</script>
<article class="group relative flex flex-col bg-white border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
  <div class="aspect-video bg-gray-100 overflow-hidden">
    <img src={article.image || 'https://picsum.photos/400/225'} alt={article.title} class="w-full h-full object-cover group-hover:scale-105 transition"/>
  </div>
  <div class="p-4 flex flex-col gap-2">
    <h3 class="font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2">{article.title}</h3>
    <p class="text-xs text-gray-500 uppercase tracking-wide">{article.category || 'Moto'}</p>
    <p class="text-sm text-gray-600 line-clamp-3">{article.excerpt}</p>
    <a href={'/articles/' + article.slug} class="mt-auto inline-flex items-center gap-1 text-sm text-indigo-600 font-medium hover:underline">Lire <i class="fas fa-arrow-right text-xs"></i></a>
  </div>
</article>`
  },
  {
    name: 'CommentSection',
    filename: 'src/lib/components/CommentSection.svelte',
    purpose: 'Zone commentaires statique (mock) avec formulaire',
    tags: ['comments','interaction'],
    code: `<script>
  export let comments = [
    { id: 1, author: 'Alex', text: 'Super article, merci !' },
    { id: 2, author: 'Nina', text: 'J'adore ce modèle.' }
  ];
</script>
<section class="mt-12">
  <h2 class="text-xl font-semibold mb-4 flex items-center gap-2"><i class="fas fa-comments text-indigo-600"></i>Commentaires</h2>
  <div class="space-y-4">
    {#each comments as c}
      <div class="p-4 rounded border bg-white">
        <p class="text-sm text-gray-700"><span class="font-semibold">{c.author}</span> — {c.text}</p>
      </div>
    {/each}
  </div>
  <form class="mt-6 space-y-3">
    <textarea rows="3" placeholder="Votre commentaire" class="w-full px-3 py-2 border rounded focus:ring-indigo-500 focus:border-indigo-500 text-sm"></textarea>
    <button type="button" class="px-5 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">Envoyer</button>
  </form>
</section>`
  },
  {
    name: 'AuthLoginForm',
    filename: 'src/lib/components/AuthLoginForm.svelte',
    purpose: 'Formulaire de connexion / inscription toggle local',
    tags: ['auth','form'],
    code: `<script>let mode='login'; let data={email:'',password:''}; function toggle(){mode= mode==='login'?'register':'login';}</script>
<div class="max-w-sm mx-auto border rounded p-6 bg-white shadow-sm">
  <h2 class="text-lg font-semibold mb-4">{mode==='login'?'Connexion':'Créer un compte'}</h2>
  <form class="space-y-3">
    <div><label class="text-xs font-medium">Email</label><input type="email" bind:value={data.email} required class="w-full px-3 py-2 border rounded mt-1"/></div>
    <div><label class="text-xs font-medium">Mot de passe</label><input type="password" bind:value={data.password} required class="w-full px-3 py-2 border rounded mt-1"/></div>
    <button type="button" class="w-full py-2 rounded bg-indigo-600 text-white text-sm">{mode==='login'?'Se connecter':'Créer un compte'}</button>
  </form>
  <button class="mt-4 text-xs text-indigo-600 hover:underline" on:click={toggle}>{mode==='login'?'Nouveau ? Créer un compte':'Déjà un compte ? Connexion'}</button>
</div>`
  },
  {
    name: 'MarkdownRenderer',
    filename: 'src/lib/components/MarkdownRenderer.svelte',
    purpose: 'Affichage markdown basique (whitelist) via marked-lite interne simplifiée',
    tags: ['docs','markdown'],
    code: `<script>
  export let source='';
  function render(md){
    return md
      .replace(/^### (.*)$/gm,'<h3>$1</h3>')
      .replace(/^## (.*)$/gm,'<h2>$1</h2>')
      .replace(/^# (.*)$/gm,'<h1>$1</h1>')
      .replace(/\\*\\*(.*?)\\*\\*/g,'<strong>$1</strong>')
      .replace(/\\*(.*?)\\*/g,'<em>$1</em>')
      .replace(/\`([^\`]+)\`/g,'<code class=\\"px-1 bg-gray-100 rounded text-xs\\">$1</code>')
      .replace(/\n\n/g,'<br/><br/>' );
  }
  $: html = render(source||'');
</script>
<div class=\"prose prose-sm max-w-none\" {@html html}></div>`
  },
  {
    name: 'SearchBar',
    filename: 'src/lib/components/SearchBar.svelte',
    purpose: 'Barre de recherche filtrage local mock',
    tags: ['search','filter'],
    code: `<script>import { createEventDispatcher } from 'svelte'; export let placeholder='Rechercher...'; let q=''; const dispatch=createEventDispatcher(); $: dispatch('input', q);</script>
<div class="relative">
  <input bind:value={q} placeholder={placeholder} class="w-full pl-9 pr-3 py-2 border rounded focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
  <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
</div>`
  },
  {
    name: 'NotificationToast',
    filename: 'src/lib/components/NotificationToast.svelte',
    purpose: 'Stack de notifications locale simple',
    tags: ['notification','toast'],
    code: `<script>let messages=['Bienvenue']; function close(i){messages.splice(i,1);} </script>
<div class="fixed top-4 right-4 space-y-2 z-50">
  {#each messages as m,i}
    <div class="px-4 py-2 bg-gray-900 text-white text-sm rounded shadow flex items-center gap-2">
      <span>{m}</span>
      <button class="text-xs opacity-70 hover:opacity-100" on:click={()=>close(i)}>×</button>
    </div>
  {/each}
</div>`
  },
  {
    name: 'InvoiceList',
    filename: 'src/lib/components/InvoiceList.svelte',
    purpose: 'Liste de factures (mock) avec statut et montant',
    tags: ['invoicing','data'],
    code: `<script>let invoices=[{id:'INV-001',client:'Acme SA',amount:1200,status:'Payée'},{id:'INV-002',client:'Globex',amount:560,status:'En attente'},{id:'INV-003',client:'Stark',amount:980,status:'En retard'}];</script>
<table class="w-full text-sm">
 <thead class="bg-gray-100 text-gray-600"><tr><th class="p-2 text-left">ID</th><th class="p-2 text-left">Client</th><th class="p-2 text-left">Montant</th><th class="p-2 text-left">Statut</th></tr></thead>
 <tbody>{#each invoices as f}<tr class="border-b"><td class="p-2 font-mono">{f.id}</td><td class="p-2">{f.client}</td><td class="p-2">{f.amount} €</td><td class="p-2"><span class="px-2 py-0.5 rounded bg-gray-200 text-xs">{f.status}</span></td></tr>{/each}</tbody>
</table>`
  },
  {
    name: 'InvoiceEditor',
    filename: 'src/lib/components/InvoiceEditor.svelte',
    purpose: 'Formulaire édition / création facture (mock local)',
    tags: ['invoicing','form'],
    code: `<script>let invoice={id:'INV-004',client:'',lines:[{desc:'Service',qty:1,price:100}]}; function addLine(){invoice.lines=[...invoice.lines,{desc:'',qty:1,price:0}]}; $: total = invoice.lines.reduce((t,l)=>t+l.qty*l.price,0);</script>
<div class="space-y-4">
 <div class="flex gap-4"><div class="flex-1"><label class="text-xs font-medium">Client</label><input bind:value={invoice.client} class="w-full px-3 py-2 border rounded mt-1"/></div><div><label class="text-xs font-medium">ID</label><input bind:value={invoice.id} class="px-3 py-2 border rounded mt-1 w-32"/></div></div>
 <table class="w-full text-xs">
  <thead><tr class="text-gray-500"><th class="p-2 text-left">Description</th><th class="p-2">Qté</th><th class="p-2">Prix</th><th class="p-2">Sous-total</th></tr></thead>
  <tbody>{#each invoice.lines as l,i}<tr class="border-b"><td class="p-2"><input bind:value={l.desc} class="w-full px-2 py-1 border rounded"/></td><td class="p-2"><input type="number" min="1" bind:value={l.qty} class="w-16 px-2 py-1 border rounded"/></td><td class="p-2"><input type="number" min="0" bind:value={l.price} class="w-20 px-2 py-1 border rounded"/></td><td class="p-2 text-right">{(l.qty*l.price).toFixed(2)} €</td></tr>{/each}</tbody>
 </table>
 <button class="px-3 py-1.5 text-xs bg-gray-900 text-white rounded" on:click={addLine}>Ajouter ligne</button>
 <div class="text-right font-semibold text-sm">Total: {total.toFixed(2)} €</div>
</div>`
  },
  {
    name: 'LanguageSwitcher',
    filename: 'src/lib/components/LanguageSwitcher.svelte',
    purpose: 'Sélecteur de langue local simple',
    tags: ['i18n','lang'],
    code: `<script>
import { getLocale, setLocale, availableLocales, onLocaleChange } from '../i18n/index.js';
import { onMount } from 'svelte';
let current = getLocale();
let locales = availableLocales();
onMount(()=> onLocaleChange(l => current = l));
function choose(l){ setLocale(l); try{ localStorage.setItem('lang', l);}catch(e){} }
onMount(()=> { try{ const saved = localStorage.getItem('lang'); if(saved && locales.includes(saved)) setLocale(saved); }catch(e){} });
</script>
<div class="inline-flex items-center gap-1 bg-white/60 backdrop-blur px-1.5 py-1 rounded border border-gray-200 shadow-sm">
 {#each locales as l}
  <button on:click={()=>choose(l)} class="px-2 py-1 text-[11px] rounded transition-colors"
    class:bg-indigo-600={l===current} class:text-white={l===current}
    class:border={l!==current} class:border-gray-300={l!==current}
    aria-current={l===current ? 'true':'false'}>{l.toUpperCase()}</button>
 {/each}
</div>`
  },
];

// Fonction utilitaire pour résumer le catalogue sans injecter TOUT le code (économie de tokens)
export function summarizeCatalog(maxChars = 1800){
  return componentsCatalog.map(c => `${c.name} -> ${c.filename} : ${c.purpose}`).join('\n').slice(0, maxChars);
}

// Sélection contextuelle de composants pertinents selon blueprint
export function selectComponentsForBlueprint(blueprint, limit = 12){
  if(!blueprint) return componentsCatalog.slice(0, limit);
  const text = JSON.stringify(blueprint).toLowerCase();
  const score = comp => {
    let s = 0;
    comp.tags.forEach(t=> { if(text.includes(t)) s += 2; });
    if(text.includes('dashboard') && comp.tags.includes('dashboard')) s += 3;
    if(text.includes('pricing') && comp.tags.includes('pricing')) s += 3;
    if(text.includes('contact') && comp.tags.includes('contact')) s += 2;
    if(text.includes('blog') && comp.tags.includes('article')) s += 2;
    return s;
  };
  const ranked = componentsCatalog.map(c => ({ c, s: score(c) }))
    .sort((a,b)=> b.s - a.s || a.c.name.localeCompare(b.c.name))
    .filter(r => r.s > 0)
    .map(r=> r.c);
  const base = ranked.length ? ranked : componentsCatalog.slice(0, limit);
  return base.slice(0, limit);
}

// Renvoie top-k composants (même scoring) mais avec extrait de code tronqué
export function topComponentCodeSnippets(blueprint, limit = 5, maxCharsPer = 380){
  const selected = selectComponentsForBlueprint(blueprint, limit * 2); // sur‑sélection puis coupe
  return selected.slice(0, limit).map(c => ({
    name: c.name,
    filename: c.filename,
    purpose: c.purpose,
    snippet: (c.code || '').trim().slice(0, maxCharsPer)
  }));
}
