<script>
  /*
    Sandbox de composants Svelte
    - Colle du code .svelte (composant racine)
    - Ajoute éventuellement des dépendances (autres fichiers .svelte simples)
    - Compile via /api/compile/component (SSR) et /api/compile/dom (Interactif)
    - Affiche métadonnées debug optionnelles
  */
  import { onMount } from 'svelte';

  let mainCode = `<script>\n  export let name = 'Sandbox';\n  let count = 0;\n<\/script>\n\n<div class=\"p-6 space-y-4\">\n  <h1 class=\"text-2xl font-bold text-purple-700\">{name} Demo</h1>\n  <button class=\"px-3 py-1 rounded bg-purple-600 text-white text-sm\" on:click={() => count++}>Incrémenter ({count})</button>\n  <p class=\"text-gray-600 text-sm\">Modifie le code dans la colonne de gauche puis recompile.</p>\n</div>`;

  // Dépendances supplémentaires: tableau d'objets { filename, code }
  let deps = [
    { filename: 'Button.svelte', code: `<script>export let label='Bouton';<\/script>\n<button class=\"px-2 py-1 rounded bg-indigo-600 text-white text-xs\">{label}</button>` }
  ];

  let addingDep = false;
  let newDepName = '';
  let newDepCode = '<script>\n  export let text = "Exemple";\n<\/script>\n\n<p class=\"text-xs text-gray-500\">{text}</p>';

  // États compilation
  let compilingSSR = false;
  let compilingDOM = false;
  let ssrUrl = '';
  let lastSSRHtml = '';
  let domUrl = '';
  let errorSSR = '';
  let errorDOM = '';
  let showDebug = true;
  let strictMode = false;
  let debugData = null; // réponse JSON debug du endpoint component
  let ssrFrame; // référence iframe SSR

  function copyInner(){
    try {
      if(!ssrFrame?.contentDocument) return;
      const inner = ssrFrame.contentDocument.querySelector('#__component_root')?.innerHTML || ssrFrame.contentDocument.body.innerHTML;
      navigator.clipboard.writeText(inner.trim());
    } catch(e){ alert('Copie impossible: '+e.message); }
  }

  // Persistence locale simple
  const STORAGE_KEY = 'sandbox-svelte-v1';
  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        if(parsed.mainCode) mainCode = parsed.mainCode;
        if(Array.isArray(parsed.deps)) deps = parsed.deps;
      }
    } catch(_e) { /* ignore */ }
    compileSSR();
    compileDOM();
  });

  function persist(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ mainCode, deps })); } catch(_e){/* ignore */}
  }

  $: persist();

  function buildDependenciesMap(){
    const map = {};
    for(const d of deps){
      if(!d.filename) continue;
      let fname = d.filename.trim();
      if(!/\.svelte$/.test(fname)) fname += '.svelte';
      // On place dans un prétendu src/lib/components/ pour simuler un import local potentiel
      const full = fname.includes('/') ? fname : `src/lib/components/${fname}`;
      map[full] = d.code;
    }
    return map;
  }

  function extractTopLevelName(code){
    const m = code.match(/export\s+let\s+name\s*=\s*['\"]([^'\"]+)/);
    return m ? m[1] : 'Component';
  }

  async function compileSSR(){
    compilingSSR = true; errorSSR=''; ssrUrl=''; debugData=null;
    try {
      const dependencies = buildDependenciesMap();
      const payload = { code: mainCode, dependencies };
      if(showDebug) payload.debug = true;
      if(strictMode) payload.strict = true;
      const res = await fetch('/api/compile/component', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if(!res.ok){
        errorSSR = await res.text();
      } else if(showDebug){
        const data = await res.json();
        if(!data.success){ errorSSR = data.error||'Erreur inconnue'; }
        else {
          debugData = data;
          if(data.html){
            lastSSRHtml = data.html;
            const blob = new Blob([data.html], { type:'text/html' });
            ssrUrl = URL.createObjectURL(blob);
          } else errorSSR='Pas de HTML retourné';
        }
      } else {
        const html = await res.text();
        lastSSRHtml = html;
        const blob = new Blob([html], { type:'text/html' });
        ssrUrl = URL.createObjectURL(blob);
      }
    } catch(e){ errorSSR = e.message; }
    finally { compilingSSR = false; }
  }

  async function compileDOM(){
    compilingDOM = true; errorDOM=''; domUrl='';
    try {
      const res = await fetch('/api/compile/dom', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code: mainCode }) });
      const data = await res.json();
      if(!data.success){ errorDOM = data.error || 'Erreur DOM'; }
      else {
        const css = data.css ? `<style>${data.css}</style>` : '';
        // On encode le JS complet (sans tentative de substitution hasardeuse) en base64 pour préserver la syntaxe
        let rawJs = data.js.replace(/export default /,'window.__App = ');
        const b64 = btoa(unescape(encodeURIComponent(rawJs)));
        const needsInternal = /from\s+['"]svelte\/internal['"]/.test(rawJs);
        const importMap = needsInternal ? `\n<script type=\"importmap\">${JSON.stringify({ imports:{ 'svelte/internal':'https://cdn.jsdelivr.net/npm/svelte@4.2.0/internal/index.js','svelte/internal/':'https://cdn.jsdelivr.net/npm/svelte@4.2.0/internal/' } })}<\/script>`: '';
        const missingDepHint = /import\s+.+\.svelte['"]/.test(rawJs) ? '<div class=\"text-[10px] text-amber-600 mb-2\">(Attention: les dépendances .svelte ne sont pas encore chargées côté DOM compile)</div>' : '';
  const html = String.raw`<!DOCTYPE html><html><head><meta charset='utf-8' />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob: https://cdn.tailwindcss.com; style-src 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; img-src data: blob:; font-src https://cdnjs.cloudflare.com; connect-src 'none';">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
<script src="https://cdn.tailwindcss.com"><\/script>${importMap}${css}
</head><body class="p-2">
${missingDepHint}<div id="app"></div>
<script>(function(){try{const js=decodeURIComponent(escape(atob('${b64}')));const blob=new Blob([js],{type:'text/javascript'});const u=URL.createObjectURL(blob);import(u).then(m=>{const App=window.__App||m.default;if(!App) throw new Error('App introuvable');new App({target:document.getElementById('app'), props:{ name:'Sandbox' }});}).catch(e=>{document.body.innerHTML='<pre style="color:#b91c1c;font:12px monospace;white-space:pre-wrap">'+e.message+'</pre>';});}catch(e){document.body.innerHTML='<pre style="color:#b91c1c">'+e.message+'</pre>';}})();<\/script>
</body></html>`;
        const blob = new Blob([html], { type:'text/html' });
        domUrl = URL.createObjectURL(blob);
      }
    } catch(e){ errorDOM = e.message; }
    finally { compilingDOM = false; }
  }

  function addDependency(){
    if(!newDepName.trim()) return;
    let n = newDepName.trim();
    if(!/\.svelte$/.test(n)) n += '.svelte';
    deps = [...deps, { filename: n, code: newDepCode }];
    newDepName='';
    addingDep=false;
    compileSSR();
  }

  function removeDep(i){
    deps = deps.filter((_,idx)=> idx!==i);
    compileSSR();
  }

  function useTemplate(kind){
    if(kind==='form'){
      mainCode = `<script>\n  import Button from 'src/lib/components/Button.svelte';\n  let email=''; let sent=false;\n  function submit(){ sent=true; }\n<\/script>\n<div class=\"max-w-sm mx-auto space-y-4 p-6\">\n  <h2 class=\"text-xl font-semibold text-purple-700\">Formulaire</h2>\n  {#if sent}<p class=\"text-emerald-600 text-sm\">Envoyé !</p>{/if}\n  <input bind:value={email} type=\"email\" placeholder=\"Email\" class=\"w-full border px-3 py-2 rounded text-sm\" />\n  <Button label=\"Envoyer\" on:click={submit} />\n  <p class=\"text-[11px] text-gray-500\">Template form avec dépendance.</p>\n</div>`;
    } else if(kind==='table'){
      mainCode = `<script>\n  let rows=[{id:1,name:'Alpha'},{id:2,name:'Beta'}];\n<\/script>\n<table class=\"min-w-full text-sm border\">\n<thead class=\"bg-gray-100 text-gray-700\"><tr><th class=\"px-2 py-1 text-left\">ID</th><th class=\"px-2 py-1 text-left\">Nom</th></tr></thead>\n<tbody>{#each rows as r}<tr class=\"odd:bg-white even:bg-gray-50\"><td class=\"px-2 py-1 border-t\">{r.id}</td><td class=\"px-2 py-1 border-t\">{r.name}</td></tr>{/each}</tbody>\n</table>`;
    }
    compileSSR();
    compileDOM();
  }
</script>

<div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
  <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
    <i class="fas fa-vial text-purple-600"></i> Sandbox Svelte
  </h1>
  <div class="grid lg:grid-cols-3 gap-6">
    <!-- Colonne gauche: code & dépendances -->
    <div class="lg:col-span-1 space-y-4">
      <div class="bg-white border rounded-lg shadow-sm">
        <div class="flex items-center justify-between px-3 py-2 border-b bg-gray-50 text-xs">
          <span class="font-semibold text-gray-700">Composant principal</span>
          <div class="flex items-center gap-2">
            <button class="px-2 py-1 rounded bg-purple-600 text-white" on:click={()=> { compileSSR(); compileDOM(); }} disabled={compilingSSR||compilingDOM}>{(compilingSSR||compilingDOM)?'...':'Compiler'}</button>
            <button class="px-2 py-1 rounded bg-gray-700 text-white" on:click={()=> showDebug=!showDebug}>{showDebug?'Debug ON':'Debug OFF'}</button>
            <label class="inline-flex items-center gap-1 cursor-pointer select-none"><input type="checkbox" bind:checked={strictMode} class="rounded border-gray-300" /> <span>Strict</span></label>
          </div>
        </div>
        <textarea bind:value={mainCode} rows="22" class="w-full p-2 text-[11px] font-mono border-0 focus:ring-0 outline-none resize-y"></textarea>
        <div class="px-3 py-2 flex items-center gap-2 text-[11px] border-t bg-gray-50">
          <span class="text-gray-500">Templates:</span>
          <button class="px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300" on:click={()=> useTemplate('form')}>Form</button>
          <button class="px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300" on:click={()=> useTemplate('table')}>Table</button>
        </div>
      </div>

      <div class="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-3 py-2 border-b bg-gray-50 text-xs">
          <span class="font-semibold text-gray-700">Dépendances ({deps.length})</span>
          <button class="px-2 py-1 rounded bg-indigo-600 text-white" on:click={()=> addingDep=!addingDep}>{addingDep?'Annuler':'Ajouter'}</button>
        </div>
        {#if addingDep}
          <div class="p-3 space-y-2 text-[11px] border-b">
            <input placeholder="Nom fichier (Button.svelte)" bind:value={newDepName} class="w-full px-2 py-1 border rounded" />
            <textarea rows="6" bind:value={newDepCode} class="w-full p-2 font-mono text-[11px] border rounded"></textarea>
            <div class="flex gap-2 justify-end">
              <button class="px-2 py-1 rounded bg-gray-200" on:click={()=> addingDep=false}>Annuler</button>
              <button class="px-2 py-1 rounded bg-indigo-600 text-white" on:click={addDependency}>Ajouter</button>
            </div>
          </div>
        {/if}
        <ul class="divide-y text-[11px]">
          {#each deps as d,i}
            <li class="p-2 flex items-start gap-2 group">
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="font-medium text-gray-700 truncate" title={d.filename}>{d.filename}</span>
                  <button class="opacity-0 group-hover:opacity-100 transition text-rose-600 text-[10px]" on:click={()=> removeDep(i)}>suppr</button>
                </div>
                <pre class="mt-1 max-h-32 overflow-auto bg-gray-50 p-1 rounded border text-[10px] whitespace-pre-wrap">{d.code}</pre>
              </div>
            </li>
          {/each}
          {#if !deps.length}
            <li class="p-3 text-gray-400 text-[11px]">Aucune dépendance.</li>
          {/if}
        </ul>
      </div>
    </div>

    <!-- Colonne droite: rendus -->
    <div class="lg:col-span-2 grid md:grid-cols-2 gap-6">
      <!-- SSR -->
      <div class="bg-white border rounded-lg shadow-sm flex flex-col relative">
        <div class="flex items-center justify-between px-3 py-2 border-b bg-gray-50 text-xs">
          <span class="font-semibold text-gray-700 flex items-center gap-2"><i class="fas fa-eye text-purple-600"></i> Rendu SSR</span>
          {#if lastSSRHtml}
            <button class="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700" on:click={() => navigator.clipboard.writeText(lastSSRHtml)}>Copier HTML</button>
          {/if}
          {#if compilingSSR}<i class="fas fa-spinner fa-spin text-purple-600"></i>{/if}
        </div>
        {#if errorSSR}
          <div class="p-3 text-[11px] text-red-600 whitespace-pre-wrap overflow-auto">{errorSSR}</div>
        {:else if ssrUrl}
          <div class="flex-1 flex flex-col">
            <iframe title="SSR" src={ssrUrl} class="flex-1 w-full h-full" bind:this={ssrFrame}></iframe>
            <div class="border-t p-1 flex gap-2 justify-end bg-gray-50">
              <button class="px-2 py-0.5 rounded bg-purple-600 text-white text-[10px]" on:click={copyInner}>Copier inner</button>
            </div>
          </div>
        {:else}
          <div class="p-4 text-[11px] text-gray-400">Aucun rendu.</div>
        {/if}
        {#if showDebug && debugData}
          <details class="border-t text-[10px] p-2 space-y-2 max-h-56 overflow-auto" open>
            <summary class="cursor-pointer font-semibold">Debug</summary>
            <div class="space-y-2">
              <div>
                <div class="text-gray-500 mb-1">Meta</div>
                <pre class="bg-gray-900 text-gray-100 p-2 rounded overflow-auto max-h-32">{JSON.stringify(debugData.meta,null,2)}</pre>
              </div>
              {#if debugData.meta?.heuristicPath}
              <div>
                <div class="text-gray-500 mb-1">Heuristics Path</div>
                <div class="bg-gray-900 text-emerald-300 p-2 rounded font-mono break-all">{debugData.meta.heuristicPath}</div>
              </div>
              {/if}
              <div>
                <div class="text-gray-500 mb-1">SSR JS (transformé)</div>
                <pre class="bg-gray-900 text-gray-100 p-2 rounded overflow-auto max-h-32">{debugData.ssrTransformed||debugData.ssrJs}</pre>
              </div>
              <div>
                <div class="text-gray-500 mb-1">DOM JS</div>
                <pre class="bg-gray-900 text-gray-100 p-2 rounded overflow-auto max-h-32">{debugData.domJs}</pre>
              </div>
            </div>
          </details>
        {/if}
      </div>

      <!-- DOM Interactif -->
      <div class="bg-white border rounded-lg shadow-sm flex flex-col relative">
        <div class="flex items-center justify-between px-3 py-2 border-b bg-gray-50 text-xs">
          <span class="font-semibold text-gray-700 flex items-center gap-2"><i class="fas fa-bolt text-indigo-600"></i> Interactif</span>
          {#if compilingDOM}<i class="fas fa-spinner fa-spin text-indigo-600"></i>{/if}
        </div>
        {#if errorDOM}
          <div class="p-3 text-[11px] text-red-600 whitespace-pre-wrap overflow-auto">{errorDOM}</div>
        {:else if domUrl}
          <iframe title="DOM" sandbox="allow-scripts" src={domUrl} class="flex-1 w-full h-full"></iframe>
        {:else}
          <div class="p-4 text-[11px] text-gray-400">Aucun runtime.</div>
        {/if}
        <div class="px-3 py-2 border-t bg-gray-50 flex items-center justify-between text-[10px] text-gray-600">
          <span>{extractTopLevelName(mainCode)}.svelte</span>
          <div class="flex gap-2">
            <button class="px-2 py-0.5 rounded bg-indigo-600 text-white" on:click={compileDOM} disabled={compilingDOM}>Rebuild</button>
            <button class="px-2 py-0.5 rounded bg-purple-600 text-white" on:click={compileSSR} disabled={compilingSSR}>SSR</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  textarea { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
  pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
</style>
