<script>
  // Page simplifiée: uniquement génération d'application IA
  let appPrompt = '';
  let useBlueprintMode = false; // Toggle mode avancé
  let blueprintData = null; // blueprint JSON retourné
  let projectId = null; // id projet persisté (si non éphémère)
  let blueprintValidation = null; // validation complète (mode blueprint)
  let blueprintGenerating = false;
  let appIsGenerating = false;
  let appFiles = null; // { filename: code }
  let appValidation = null; // { filename: { diagnostics, ssrOk, domOk, formatted, ... } }
  let appSelectedFile = null;
  let appError = '';
  // Fichiers / analyses
  let uploading = false;
  let analyzing = false;
  let uploadedFiles = []; // { name, hash, mime, signedUrl }
  let selectedFileHash = null;
  let analyses = {}; // hash -> analysis summary
  let fileHashesForGeneration = []; // sélection utilisateur envoyée à generate/app
  let compileUrl = '';
  let compiling = false;
  let activeView = 'code'; // 'files' | 'code' | 'preview-ssr' | 'preview-interactive' | 'app-nav'
  const compileCache = new Map(); // filename -> objectURL
  const compileErrorCache = new Map(); // filename -> { firstTs, lastTs, count, lastError }
  const interactiveCache = new Map(); // filename -> { url, ts }
  let interactiveUrl = '';
  let interactiveLoading = false;
  let stubbedComponents = []; // liste des composants stub détectés (SSR preview)
  let libStubbedComponents = []; // composants $lib stubés
  let dependencyErrors = []; // erreurs compilation dépendances
  let generatingStub = null; // nom du composant en cours de génération
  let generatingAll = false; // flag génération groupée
  let showCompileDebug = false; // toggle debug panel
  let compileDebugData = null; // stockage réponse debug
  // --- App navigation preview (étape 4) ---
  let appNavUrl = '';
  let appNavPath = '/';
  let appNavLoading = false;
  let appNavError = '';
  let appAvailableRoutes = [];

  function listLocalRoutes(){
    if(!appFiles) return [];
    return Object.keys(appFiles).filter(f=> f.startsWith('src/routes/') && f.endsWith('+page.svelte'))
      .map(f=> f.replace(/^src\/routes\//,'').replace(/\/\+page\.svelte$/,'') || '/')
      .sort();
  }

  async function loadAppRoute(path='/'){
    appNavLoading = true; appNavError='';
    try {
      if(projectId){
        const res = await fetch(`/api/projects/${projectId}/ssr?path=${encodeURIComponent(path)}`);
        const data = await res.json();
        if(!data.success){ appNavError = data.error||'Erreur route'; appAvailableRoutes = data.available||appAvailableRoutes; }
        else {
          appNavPath = path;
          appAvailableRoutes = [...new Set([...(appAvailableRoutes||[]), path])];
          const blob = new Blob([data.htmlHydratable||data.html||''], { type:'text/html' });
          appNavUrl = URL.createObjectURL(blob);
        }
      } else {
        const routes = listLocalRoutes();
        appAvailableRoutes = routes;
        if(!routes.includes(path)) { appNavError='Route non trouvée'; return; }
        const targetFile = Object.keys(appFiles).find(f=> f.startsWith('src/routes/') && f.endsWith('+page.svelte') && (f.replace(/^src\/routes\//,'').replace(/\/\+page\.svelte$/,'')||'/')===path);
        if(!targetFile){ appNavError='Fichier route introuvable'; return; }
  const source = `<script>import Page from '${targetFile}';<\/script><Page />`;
        const deps = collectDependencies(targetFile, appFiles[targetFile]);
  const res = await fetch('/api/compile/component', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code: source, dependencies: { ...deps, [targetFile]: appFiles[targetFile] } }) });
        if(!res.ok){ appNavError = await res.text(); }
        else { const html = await res.text(); const blob = new Blob([html], { type:'text/html' }); appNavUrl = URL.createObjectURL(blob); appNavPath = path; }
      }
    } catch(e){ appNavError = e.message; }
    finally { appNavLoading = false; }
  }

  $: if(activeView==='app-nav' && appFiles && !appNavUrl && !appNavLoading){ loadAppRoute(appNavPath||'/'); }

  async function generateStubComponent(name){
    if(!name || generatingStub) return;
    generatingStub = name;
    try {
      const prompt = `Crée un composant Svelte réutilisable simple nommé ${name} avec un léger style Tailwind. Expose des props pertinentes si nécessaire.`;
      const res = await fetch('/api/generate/component', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, prompt }) });
      let data; try { data = await res.json(); } catch(_e){ data=null; }
      if(!data || !data.success || !data.code){ throw new Error(data?.error||'Generation API échouée'); }
      // Injecter le nouveau fichier dans appFiles (s'il y a une arborescence lib/components)
      const filename = `src/lib/components/${name}.svelte`;
      appFiles = { ...appFiles, [filename]: data.code };
      // Déclencher revalidation basique via endpoint repair
      try {
        const vRes = await fetch('/api/repair', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename, code: data.code, diagnostics: [] }) });
        const vData = await vRes.json();
        if(vData.success && vData.validation){
          appValidation = { ...(appValidation||{}), [filename]: vData.validation };
        }
      } catch(_e){ /* ignore */ }
      selectFile(filename);
      activeView='code';
    } catch(e){ appError = 'Génération composant '+name+': '+e.message; }
    finally { generatingStub = null; }
  }

  async function generateAllStubComponents(){
    if(!stubbedComponents.length || generatingAll) return;
    generatingAll = true; appError='';
    try {
      for(const name of stubbedComponents){
        generatingStub = name; // réutilise spinner individuel
        await generateStubComponent(name);
      }
    } catch(e){ appError = 'Génération groupée: '+e.message; }
    finally { generatingStub=null; generatingAll=false; }
  }
  let showDiagnostics = true;
  let repairing = false;
  let repairMessage = '';
  let lastPatched = null;
  let autoRepairing = false;
  let autoRepairMessage = '';
  let showDiff = false;
  const fileHistory = new Map(); // filename -> [{code, ts}]
  let bulkAutoRepairing = false;
  let bulkMessage = '';
  let restoring = false;
  let restoreMessage = '';
  let showHistory = false;
  const redoStacks = new Map(); // filename -> [ {code, ts} ]

  function pushHistory(filename, code){
    if(!filename || !code) return;
    const arr = fileHistory.get(filename) || [];
    // éviter doublons consécutifs identiques
    if(arr.length && arr[arr.length-1].code === code) return;
    arr.push({ code, ts: Date.now() });
    if(arr.length>6) arr.shift();
    fileHistory.set(filename, arr);
    // Invalidation de la pile redo (nouvelle branche d'historique)
    redoStacks.set(filename, []);
  }

  function getLastVersion(filename){
    const arr = fileHistory.get(filename) || [];
    if(arr.length<1) return null;
    return arr[arr.length-1].code;
  }

  async function restorePrevious(){
    if(!appSelectedFile || restoring) return;
    const hist = fileHistory.get(appSelectedFile);
    if(!hist || !hist.length) { restoreMessage='Aucune version à restaurer.'; return; }
    restoring = true; restoreMessage='';
    try {
      const previous = hist[hist.length-1];
      if(!previous){ restoreMessage='Aucune version précédente.'; restoring=false; return; }
      const current = appFiles[appSelectedFile];
      // Pousser la version courante dans redo stack
      const rStack = redoStacks.get(appSelectedFile) || [];
      rStack.push({ code: current, ts: Date.now() });
      redoStacks.set(appSelectedFile, rStack);
      // Appliquer l'ancienne version et retirer du history
      hist.pop();
      appFiles[appSelectedFile] = previous.code;
      compileCache.delete(appSelectedFile);
      interactiveCache.delete(appSelectedFile);
      // Revalidation rapide via endpoint repair (sans diagnostics) pour récupérer structure validation uniforme
      try {
        const res = await fetch('/api/repair', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename: appSelectedFile, code: previous.code, diagnostics: [] }) });
        const data = await res.json();
        if(data.success && data.validation){
          appValidation[appSelectedFile] = data.validation;
        }
      } catch(e){ /* ignore */ }
      restoreMessage = 'Version précédente restaurée.';
      showDiff = false;
    } catch(e){
      restoreMessage = 'Erreur restauration: '+ e.message;
    } finally {
      restoring = false;
    }
  }

  async function restoreFromHistory(index){
    if(!appSelectedFile || restoring) return;
    const hist = fileHistory.get(appSelectedFile);
    if(!hist || index < 0 || index >= hist.length){ restoreMessage='Index invalide.'; return; }
    restoring = true; restoreMessage='';
    try {
      const target = hist[index];
      const current = appFiles[appSelectedFile];
      // Pousser version courante dans redo
      const rStack = redoStacks.get(appSelectedFile) || [];
      rStack.push({ code: current, ts: Date.now() });
      redoStacks.set(appSelectedFile, rStack);
      // Couper l'historique à index (on garde seulement les versions antérieures à target)
      const kept = hist.slice(0, index);
      fileHistory.set(appSelectedFile, kept);
      appFiles[appSelectedFile] = target.code;
      compileCache.delete(appSelectedFile);
      interactiveCache.delete(appSelectedFile);
      try {
        const res = await fetch('/api/repair', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename: appSelectedFile, code: target.code, diagnostics: [] }) });
        const data = await res.json();
        if(data.success && data.validation){
          appValidation[appSelectedFile] = data.validation;
        }
      } catch(e){/* ignore */}
      restoreMessage = 'Version sélectionnée restaurée.';
      showDiff = false; showHistory = false;
    } catch(e){
      restoreMessage = 'Erreur restauration ciblée: '+ e.message;
    } finally { restoring=false; }
  }

  async function redoPrevious(){
    if(!appSelectedFile) return;
    const stack = redoStacks.get(appSelectedFile) || [];
    if(!stack.length){ restoreMessage='Rien à refaire.'; return; }
    const next = stack.pop();
    redoStacks.set(appSelectedFile, stack);
    // Sauvegarder version actuelle dans l'historique avant d'appliquer redo
    pushHistory(appSelectedFile, appFiles[appSelectedFile]);
    appFiles[appSelectedFile] = next.code;
    compileCache.delete(appSelectedFile); interactiveCache.delete(appSelectedFile);
    try {
      const res = await fetch('/api/repair', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename: appSelectedFile, code: next.code, diagnostics: [] }) });
      const data = await res.json();
      if(data.success && data.validation) appValidation[appSelectedFile] = data.validation;
    } catch(e){ /* ignore */ }
    restoreMessage = 'Rétablissement effectué.';
  }

  function computeDiff(a,b){
    if(a===b) return [{ type:'same', text:a }];
    const aLines = a.split('\n');
    const bLines = b.split('\n');
    const m = aLines.length, n = bLines.length;
    const dp = Array.from({length:m+1}, ()=> Array(n+1).fill(0));
    for(let i=m-1;i>=0;i--){
      for(let j=n-1;j>=0;j--){
        if(aLines[i]===bLines[j]) dp[i][j] = 1 + dp[i+1][j+1];
        else dp[i][j] = Math.max(dp[i+1][j], dp[i][j+1]);
      }
    }
    const out = [];
    let i=0,j=0;
    while(i<m && j<n){
      if(aLines[i]===bLines[j]){ out.push({ type:'same', text:aLines[i] }); i++; j++; }
      else if(dp[i+1][j] >= dp[i][j+1]){ out.push({ type:'del', text:aLines[i] }); i++; }
      else { out.push({ type:'add', text:bLines[j] }); j++; }
    }
    while(i<m){ out.push({ type:'del', text:aLines[i++] }); }
    while(j<n){ out.push({ type:'add', text:bLines[j++] }); }
    return out;
  }

  async function generateApplication() {
    appError = '';
    if(useBlueprintMode){ blueprintGenerating = true; } else { appIsGenerating = true; }
    try {
      let data;
      if(useBlueprintMode){
        const res = await fetch('/api/site/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query: appPrompt, provider:'openai' }) });
        data = await res.json();
        if(!data.success) throw new Error(data.error||'Erreur blueprint');
        blueprintData = data.blueprint;
        appFiles = data.files || null;
        blueprintValidation = data.validation || null;
        projectId = data.project?.id || null;
        appValidation = data.validation || null; // pour réutiliser UI existante
      } else {
        const res = await fetch('/api/generate/app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: appPrompt, fileHashes: fileHashesForGeneration })
        });
        data = await res.json();
        if (!data.success) throw new Error(data.error || 'Erreur inconnue');
        appFiles = data.files || null;
        appValidation = data.validation || null;
      }
      if(appFiles){
        const keys = Object.keys(appFiles);
        // On privilégie le premier fichier .svelte pour que l'utilisateur voie rapidement un rendu
        const firstSvelte = keys.find(k=>k.endsWith('.svelte'));
        appSelectedFile = firstSvelte || keys[0] || null;
        // Si on a trouvé un .svelte on bascule automatiquement sur l'onglet Rendu SSR
  if(firstSvelte) activeView = 'preview-ssr'; else activeView='files';
      } else {
        appSelectedFile = null;
      }
    } catch (e) {
      console.error(e);
      appError = e.message;
    } finally {
      if(useBlueprintMode){ blueprintGenerating = false; } else { appIsGenerating = false; }
    }
  }

  async function handleFileInput(e){
    const files = Array.from(e.target.files||[]);
    for(const f of files){ await uploadSingle(f); }
    e.target.value='';
  }
  async function uploadSingle(file){
    uploading = true; appError='';
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/files/upload', { method:'POST', body: fd });
      const data = await res.json();
      if(!data.success) throw new Error(data.error||'Upload échoué');
      uploadedFiles = [...uploadedFiles.filter(u=> u.hash!==data.hash), { name: data.name, hash: data.hash, mime: data.mime, signedUrl: data.signedUrl }];
    } catch(e){ appError = e.message; }
    finally { uploading = false; }
  }
  async function analyzeFile(u){
    analyzing = true; appError='';
    try {
      // L'analyse se base sur hash (si déjà en base) => re-download non nécessaire : mais notre endpoint attend contenu; on n'a pas bucketObject ici car private.
      // Stratégie: si on a signedUrl temporaire on le fetch puis re-post.
      let buf=null; let mime=u.mime;
      if(u.signedUrl){
        const r = await fetch(u.signedUrl); const arr = await r.arrayBuffer(); buf = new Uint8Array(arr); }
      if(!buf){ appError='Impossible de récupérer contenu pour analyse'; analyzing=false; return; }
      const b64 = btoa(String.fromCharCode(...buf));
      const res = await fetch('/api/files/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ base64: b64, mime }) });
      const data = await res.json();
      if(!data.success) throw new Error(data.error||'Analyse échouée');
      analyses[u.hash] = data.analysis || { summary: data.analysis?.summary || 'Analyse indisponible' };
      if(!fileHashesForGeneration.includes(u.hash)) fileHashesForGeneration = [...fileHashesForGeneration, u.hash];
    } catch(e){ appError = e.message; }
    finally { analyzing = false; }
  }
  function toggleHashSelection(h){
    if(fileHashesForGeneration.includes(h)) fileHashesForGeneration = fileHashesForGeneration.filter(x=> x!==h);
    else fileHashesForGeneration = [...fileHashesForGeneration, h];
  }

  function resetGeneration() {
    appFiles = null;
    appValidation = null;
    appSelectedFile = null;
    compileUrl='';
    blueprintData=null; projectId=null; blueprintValidation=null;
    interactiveUrl='';
  }
  function selectFile(f) { appSelectedFile = f; }
  function copyCurrent() { if(appSelectedFile) navigator.clipboard.writeText(appFiles[appSelectedFile]); }
  async function repairCurrent(){
    if(!appSelectedFile || !appValidation?.[appSelectedFile]) return;
    repairing = true; repairMessage='';
    try {
      const meta = appValidation[appSelectedFile];
      pushHistory(appSelectedFile, meta.formatted || meta.original || appFiles[appSelectedFile]);
      let res;
      if(useBlueprintMode && projectId){
        res = await fetch('/api/repair/project', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, filename: appSelectedFile, code: meta.formatted || meta.original || appFiles[appSelectedFile], diagnostics: meta.diagnostics||[] }) });
      } else {
        res = await fetch('/api/repair', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename: appSelectedFile, code: meta.formatted || meta.original || appFiles[appSelectedFile], diagnostics: meta.diagnostics||[] }) });
      }
      const data = await res.json();
      if(!data.success) throw new Error(data.error||'Échec réparation');
      lastPatched = data.patchedCode;
      appFiles[appSelectedFile] = data.patchedCode;
      compileCache.delete(appSelectedFile);
      interactiveCache.delete(appSelectedFile);
      // Intégration revalidation live si présente
      if(data.validation){
        appValidation[appSelectedFile] = {
          ...data.validation,
          original: meta.original,
          fixed: data.validation.fixed || data.patchedCode,
          formatted: data.validation.formatted || data.patchedCode
        };
        const errs = data.validation.diagnostics?.filter(d=>d.severity==='error').length || 0;
        if(errs===0) repairMessage = 'Réparation appliquée et validée ✔'; else repairMessage = `Réparation appliquée mais ${errs} erreur(s) restantes.`;
      } else {
        repairMessage = 'Réparation appliquée (validation indisponible).';
      }
      // Forcer rafraîchissement preview si l'onglet est actif
      if(activeView === 'preview-ssr') {
        compileCache.delete(appSelectedFile);
        compileSelected();
      } else if(activeView === 'preview-interactive') {
        interactiveCache.delete(appSelectedFile);
        buildInteractive();
      }
    } catch(e){ repairMessage = e.message; }
    finally { repairing = false; }
  }

  async function autoRepairCurrent(){
    if(!appSelectedFile) return;
    autoRepairing = true; autoRepairMessage='';
    try {
      const meta = appValidation?.[appSelectedFile];
      pushHistory(appSelectedFile, meta?.formatted || appFiles[appSelectedFile]);
      const payload = { filename: appSelectedFile, code: meta?.formatted || appFiles[appSelectedFile], maxPasses: 3 };
      if(useBlueprintMode && projectId) payload.projectId = projectId;
      const res = await fetch('/api/repair/auto', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const data = await res.json();
      if(!data.success) throw new Error(data.error||'Auto-réparation échouée');
      appFiles[appSelectedFile] = data.fixedCode;
      compileCache.delete(appSelectedFile); interactiveCache.delete(appSelectedFile);
      // revalidation locale
      try {
        const vRes = await fetch('/api/repair', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename: appSelectedFile, code: data.fixedCode, diagnostics: [] }) });
        const vData = await vRes.json();
        if(vData.success && vData.validation){
          appValidation[appSelectedFile] = vData.validation;
        }
      } catch(e) { /* ignore */ }
      if(data.finalDiagnostics?.length){
        autoRepairMessage = `Auto-réparation partielle (${data.passes} passes, ${data.finalDiagnostics.length} erreur(s) restantes)`;
      } else {
        autoRepairMessage = `Auto-réparation réussie en ${data.passes} passe(s)`;
      }
      if(activeView === 'preview-ssr') {
        compileCache.delete(appSelectedFile);
        compileSelected();
      } else if(activeView === 'preview-interactive') {
        interactiveCache.delete(appSelectedFile);
        buildInteractive();
      }
    } catch(e){
      autoRepairMessage = e.message;
    } finally { autoRepairing = false; }
  }

  async function bulkAutoRepair(){
    if(!appFiles || bulkAutoRepairing) return;
    bulkAutoRepairing = true; bulkMessage='';
    try {
      const errorFiles = Object.keys(appFiles).filter(f=> appValidation?.[f]?.diagnostics?.some(d=> d.severity==='error'));
      if(!errorFiles.length){ bulkMessage='Aucune erreur à corriger.'; bulkAutoRepairing=false; return; }
      for(const f of errorFiles){
        const meta = appValidation[f];
        pushHistory(f, meta?.formatted || appFiles[f]);
        const payload = { filename: f, code: meta?.formatted || appFiles[f], maxPasses: 3 };
        if(useBlueprintMode && projectId) payload.projectId = projectId;
        const res = await fetch('/api/repair/auto', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const data = await res.json();
        if(data.success){
          appFiles[f] = data.fixedCode;
          // revalidation post modif isolée
          try {
            const vRes = await fetch('/api/repair', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename: f, code: data.fixedCode, diagnostics: [] }) });
            const vData = await vRes.json();
            if(vData.success && vData.validation) appValidation[f] = vData.validation;
          } catch(e){ /* ignore */ }
          if(f === appSelectedFile){
            if(activeView === 'preview-ssr') { compileCache.delete(f); compileSelected(); }
            else if(activeView === 'preview-interactive') { interactiveCache.delete(f); buildInteractive(); }
          }
        } else {
          bulkMessage += `\n${f}: échec (${data.error})`;
        }
      }
      if(!bulkMessage){
        bulkMessage = 'Auto-réparation terminée.';
      }
    } catch(e){ bulkMessage = 'Erreur globale: '+e.message; }
    finally { bulkAutoRepairing=false; }
  }

  // -------- Détection & résolution des dépendances pour compilation composant --------
  // Normalisation basique d'un chemin relatif (sans accès à path.posix côté navigateur)
  function normalizePath(parts){
    const out=[];
    for(const p of parts){
      if(!p || p==='.') continue;
      if(p==='..') { out.pop(); continue; }
      out.push(p);
    }
    return out.join('/');
  }

  function resolveImport(spec, fromFile){
    if(!appFiles) return null;
    // $lib alias => src/lib/
    if(spec.startsWith('$lib/')){
      let rel = 'src/lib/' + spec.slice(5);
      const candidates = [];
      if(/\.(svelte|js|ts)$/.test(rel)) candidates.push(rel); else candidates.push(rel + '.svelte', rel + '.js');
      for(const c of candidates){ if(appFiles[c]) return c; }
      return null;
    }
    // Chemin relatif
    if(spec.startsWith('./') || spec.startsWith('../')){
      const baseDir = fromFile.includes('/') ? fromFile.slice(0, fromFile.lastIndexOf('/')) : '';
      const rawParts = (baseDir ? baseDir.split('/') : []).concat(spec.split('/'));
      let norm = normalizePath(rawParts);
      const tries = [];
      if(/\.(svelte|js|ts)$/.test(norm)) tries.push(norm); else tries.push(norm + '.svelte', norm + '.js');
      for(const t of tries){ if(appFiles[t]) return t; }
      return null;
    }
    // Import absolu relatif au root généré (ex: src/lib/components/Button)
    if(spec.startsWith('src/')){
      const tries = /\.(svelte|js|ts)$/.test(spec) ? [spec] : [spec + '.svelte', spec + '.js'];
      for(const t of tries){ if(appFiles[t]) return t; }
      return null;
    }
    return null; // on ignore dépendances de node_modules
  }

  function extractImports(code){
    const out=[]; if(!code) return out;
    const importRegex = /import\s+[^;]+?\s+from\s+['\"]([^'\"]+)['\"]/g; let m;
    while((m = importRegex.exec(code))){ out.push(m[1]); }
    return out;
  }

  function collectDependencies(entryFile, entryCode){
    const deps={}; if(!appFiles) return deps;
    const visited=new Set();
    function walk(file, code, depth){
      if(depth>25) return; // garde sécurité
      const imports = extractImports(code);
      for(const spec of imports){
        const resolved = resolveImport(spec, file);
        if(!resolved || visited.has(resolved) || resolved===entryFile) continue;
        visited.add(resolved);
        const depCode = appFiles[resolved];
        if(depCode && resolved.endsWith('.svelte')){ deps[resolved] = depCode; walk(resolved, depCode, depth+1); }
      }
    }
    walk(entryFile, entryCode, 0);
    return deps;
  }

  async function compileSelected() {
    if(!appSelectedFile || !appSelectedFile.endsWith('.svelte')) { compileUrl=''; return; }
    if(compiling) return; // garde anti rafale
    // Si on a une erreur récente (<5s) pour ce fichier, ne pas relancer immédiatement
    const errInfo = compileErrorCache.get(appSelectedFile);
    if(errInfo && Date.now() - errInfo.lastTs < 5000) {
      console.warn('[compileSelected] skip retry (recent error)', errInfo);
      return;
    }
    compiling = true; compileUrl='';
    try {
      // Utilise endpoint component compile direct sans projet persistant
      const deps = collectDependencies(appSelectedFile, appFiles[appSelectedFile]);
      const payload = { code: appFiles[appSelectedFile], dependencies: deps };
      if(showCompileDebug) payload.debug = true;
      const res = await fetch('/api/compile/component', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if(!res.ok){
        const text = await res.text();
        compileUrl='error:'+ text;
        const now = Date.now();
        if(!errInfo) compileErrorCache.set(appSelectedFile, { firstTs: now, lastTs: now, count:1, lastError: text.slice(0,180) });
        else { errInfo.lastTs = now; errInfo.count++; errInfo.lastError = text.slice(0,180); compileErrorCache.set(appSelectedFile, errInfo); }
      }
      else {
        if(showCompileDebug){
          const data = await res.json();
          compileDebugData = data;
          if(data.html){
            const blob = new Blob([data.html], { type:'text/html' });
            compileUrl = URL.createObjectURL(blob);
            compileCache.set(appSelectedFile, compileUrl);
          }
        } else {
          const html = await res.text();
          const blob = new Blob([html], { type:'text/html' });
            compileUrl = URL.createObjectURL(blob);
            compileCache.set(appSelectedFile, compileUrl);
        }
      }
    } catch(e){ compileUrl = 'error:'+e.message; }
    finally { compiling = false; }
  }

  // Mise à jour automatique prévisualisation SSR quand onglet actif
  $: if(activeView === 'preview-ssr' && appSelectedFile?.endsWith('.svelte')) {
    // Charger depuis cache sinon compiler (anti-boucle: compile uniquement si pas déjà en cours et pas erreur fraîche)
    if(compileCache.has(appSelectedFile)) {
      compileUrl = compileCache.get(appSelectedFile);
    } else if(!compiling) {
      compileSelected();
    }
  }

  // Surveiller les changements d'URL de compilation pour extraire meta comment des composants manquants
  $: if(compileUrl && compileUrl.startsWith('blob:')) {
    // Fetch léger du blob pour inspecter meta comment (limite 10kb)
    (async () => {
      try {
        const res = await fetch(compileUrl);
        const text = await res.text();
        const m = text.match(/<!--missing-components:([^>]+)-->/);
        if(m){
          const list = m[1].split(',').map(s=> s.trim()).filter(Boolean);
          stubbedComponents = list;
        } else {
          stubbedComponents = [];
        }
        const ml = text.match(/<!--missing-lib-components:([^>]+)-->/);
        if(ml){
          libStubbedComponents = ml[1].split(',').map(s=> s.trim()).filter(Boolean);
        } else libStubbedComponents = [];
        const de = text.match(/<!--dependency-errors:([^>]+)-->/);
        if(de){
          dependencyErrors = de[1].split('|').map(s=> s.trim()).filter(Boolean);
        } else dependencyErrors = [];
      } catch(_e){ /* ignore */ }
    })();
  }

  async function buildInteractive() {
    if(!appSelectedFile || !appSelectedFile.endsWith('.svelte')) { interactiveUrl=''; return; }
    if(interactiveCache.has(appSelectedFile)) { interactiveUrl = interactiveCache.get(appSelectedFile).url; return; }
    interactiveLoading = true; interactiveUrl='';
    try {
      const res = await fetch('/api/compile/dom', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code: appFiles[appSelectedFile] }) });
      const data = await res.json();
      if(!data.success) { interactiveUrl = 'error:'+ (data.error||'Compilation DOM échouée'); }
      else {
        const cssBlock = data.css ? `<style>${data.css}</style>` : '';
        const componentJs = data.js;
        const safeCssBlock = cssBlock.replace(/<\/script>/g,'<\\/script>');
        const safeJsBase = componentJs.replace(/<\/script>/g,'<\\/script>');
        // Transforme export default pour exposer la classe puis encapsule tout dans un script injecté dynamiquement
        const safeJs = safeJsBase.replace(/export default /, 'window.__App = ');
        const payload = {
          css: safeCssBlock,
          js: safeJs
        };
        const bootParts = [];
        bootParts.push('<!DOCTYPE html><html><head><meta charset="utf-8" />');
        bootParts.push('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />');
        bootParts.push('<scr'+'ipt src="https://cdn.tailwindcss.com"></scr'+'ipt>');
        if(payload.css) bootParts.push(payload.css);
        bootParts.push('</head><body class="p-4"><div id="app"></div>');
        bootParts.push('<scr'+'ipt>(function(){');
        bootParts.push('const data = JSON.parse(decodeURIComponent("'+encodeURIComponent(JSON.stringify(payload))+'"));');
        bootParts.push("try{");
        bootParts.push("const blob = new Blob([data.js],{type:'text/javascript'});");
        bootParts.push("const u = URL.createObjectURL(blob);");
        bootParts.push("import(u).then(m=>{const App = window.__App || m.default || m.App; const target=document.getElementById('app'); new App({target});});");
        bootParts.push("}catch(e){document.getElementById('app').innerText='Erreur JS: '+e.message}");
        bootParts.push('})();</scr'+'ipt></body></html>');
        const boot = bootParts.join('\n');
        const runtime = boot;
        const blob = new Blob([runtime], { type:'text/html' });
        const url = URL.createObjectURL(blob);
        interactiveUrl = url;
        interactiveCache.set(appSelectedFile, { url, ts: Date.now() });
      }
    } catch(e){ interactiveUrl = 'error:'+e.message; }
    finally { interactiveLoading = false; }
  }

  // Mise à jour automatique prévisualisation interactive quand onglet actif
  $: if(activeView === 'preview-interactive' && appSelectedFile?.endsWith('.svelte')) {
    if(interactiveCache.has(appSelectedFile)) interactiveUrl = interactiveCache.get(appSelectedFile).url; else if(!interactiveLoading) buildInteractive();
  }
</script>

<div class="max-w-6xl mx-auto px-4 py-10">
  <h1 class="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
    <i class="fas fa-diagram-project text-purple-600"></i>
    Générateur d'application
  </h1>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Panneau gauche: Prompt & actions -->
    <div class="bg-white border rounded-xl shadow-sm p-5 flex flex-col gap-5">
      <div>
        <label for="app_prompt" class="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
        <textarea id="app_prompt" bind:value={appPrompt} rows="8" placeholder="Ex: Génère une mini app SvelteKit avec une page d'accueil, page produits et page contact. Utilise Tailwind." class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"></textarea>
        <p class="text-[11px] text-gray-500 mt-1 leading-snug">Décris architecture, pages, style, contraintes (taille, libs). Moins de 8 fichiers recommandé.</p>
      </div>
      <div class="flex items-center gap-2 text-xs bg-gray-50 border rounded p-2">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" bind:checked={useBlueprintMode} class="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
          <span class="font-medium text-gray-700">Mode Blueprint avancé</span>
        </label>
        <span class="text-[10px] text-gray-500">{useBlueprintMode ? 'Multi-fichiers orchestré avec blueprint, validation complète & persistance projet (si auth).' : 'Génération simple multi-fichiers rapide.'}</span>
      </div>
      <div class="flex items-center gap-3">
        <button class="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow hover:from-purple-500 hover:to-fuchsia-500 disabled:opacity-50 flex items-center gap-2" on:click={generateApplication} disabled={!appPrompt.trim() || appIsGenerating || blueprintGenerating}>
          {#if appIsGenerating || blueprintGenerating}<i class="fas fa-spinner fa-spin"></i>{:else}<i class="fas fa-gears"></i>{/if}
          {useBlueprintMode ? 'Générer Blueprint' : 'Générer'}
        </button>
        <div class="relative">
          <label class="px-4 py-2 rounded-lg text-sm bg-white border hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
            <i class="fas fa-upload"></i> {uploading ? 'Upload...' : 'Ajouter fichiers'}
            <input type="file" class="hidden" multiple on:change={handleFileInput} accept="image/png,image/jpeg,image/webp,image/gif" />
          </label>
        </div>
        {#if appFiles}
          <button class="px-4 py-2 rounded-lg text-sm bg-white border hover:bg-gray-50 flex items-center gap-2" on:click={resetGeneration}><i class="fas fa-rotate-left"></i> Réinitialiser</button>
        {/if}
      </div>
      {#if appError}
        <div class="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">{appError}</div>
      {/if}
      {#if useBlueprintMode && blueprintData}
        <div class="text-[11px] bg-indigo-50 border border-indigo-200 text-indigo-700 rounded p-2 space-y-1 max-h-48 overflow-auto">
          <div class="font-semibold flex items-center gap-1"><i class="fas fa-sitemap"></i> Blueprint</div>
          <div><span class="font-medium">Routes:</span> {blueprintData.routes?.map(r=>r.path).join(', ')}</div>
          {#if blueprintData.core_components?.length}
            <div><span class="font-medium">Composants:</span> {blueprintData.core_components.join(', ')}</div>
          {/if}
          {#if blueprintData.design_tokens?.colors?.length}
            <div><span class="font-medium">Palette:</span> {blueprintData.design_tokens.colors.slice(0,6).join(', ')}{#if blueprintData.design_tokens.colors.length>6}...{/if}</div>
          {/if}
          {#if projectId}<div class="text-[10px] text-indigo-500">Projet ID: {projectId}</div>{/if}
        </div>
      {/if}
      {#if uploadedFiles.length}
        <div class="border rounded p-2 space-y-2 bg-gray-50">
          <div class="text-[11px] font-semibold flex items-center gap-2 text-gray-700"><i class="fas fa-photo-film text-purple-500"></i> Fichiers ({uploadedFiles.length})</div>
          <div class="space-y-1 max-h-40 overflow-auto pr-1">
            {#each uploadedFiles as f}
              <div class="flex items-start gap-2 p-1 rounded border bg-white text-[11px]">
                <div class="flex-1 min-w-0">
                  <div class="truncate font-medium" title={f.name}>{f.name}</div>
                  <div class="text-[10px] text-gray-500 truncate">{f.hash}</div>
                  <div class="flex gap-2 mt-1 items-center">
                    <button class="px-2 py-0.5 rounded bg-purple-600 text-white text-[10px] hover:bg-purple-500 disabled:opacity-50" disabled={analyzing || analyses[f.hash]} on:click={()=> analyzeFile(f)}>{analyses[f.hash] ? 'Analysé' : (analyzing ? '...' : 'Analyser')}</button>
                    <button class="px-2 py-0.5 rounded border text-[10px] hover:bg-gray-100" class:!bg-emerald-100={fileHashesForGeneration.includes(f.hash)} on:click={()=> toggleHashSelection(f.hash)}>{fileHashesForGeneration.includes(f.hash) ? 'Sélectionné' : 'Sélect.'}</button>
                  </div>
                </div>
                {#if f.signedUrl && f.mime.startsWith('image/')}
                  <img src={f.signedUrl} alt={f.name} class="w-12 h-12 object-cover rounded border" />
                {/if}
              </div>
            {/each}
          </div>
          {#if fileHashesForGeneration.length}
            <div class="text-[10px] text-gray-600">Hashes utilisés pour la génération: {fileHashesForGeneration.slice(0,4).join(', ')}{#if fileHashesForGeneration.length>4}…{/if}</div>
          {/if}
        </div>
      {/if}
      <div class="text-[11px] text-gray-500 leading-relaxed">
        <p class="mb-1 font-medium text-gray-700">Tips :</p>
        <ul class="list-disc pl-4 space-y-0.5">
          <li>Nomme les routes (/, /produits, /contact)</li>
          <li>Indique style (SaaS moderne, gradient bleu)</li>
          <li>Précise contraintes: « pas d'auth », « données mock »</li>
          <li>Limite nombre de fichiers si besoin</li>
        </ul>
      </div>
    </div>

    <!-- Panneau droit: Résultats (onglets toujours visibles) -->
    <div class="bg-white border rounded-xl shadow-sm p-0 flex flex-col overflow-hidden lg:col-span-2 min-h-[540px]">
      <div class="flex h-full">
        <div class="flex-1 flex flex-col">
          <!-- Barre onglets globaux toujours affichée -->
          <div class="bg-gray-50 border-b px-4 pt-3">
              <div class="flex items-center gap-6 text-[12px] font-medium">
              <button class="pb-2 -mb-px border-b-2 border-transparent hover:text-gray-800 {activeView==='files' ? 'text-purple-600 border-purple-600' : 'text-gray-500'}" on:click={()=> activeView='files'}>
                <i class="fas fa-folder-open mr-1"></i>Fichiers
              </button>
              <button class="pb-2 -mb-px border-b-2 border-transparent hover:text-gray-800 {activeView==='code' ? 'text-purple-600 border-purple-600' : 'text-gray-500'}" on:click={()=> activeView='code'} disabled={!appSelectedFile}>
                <i class="fas fa-code mr-1"></i>Code
              </button>
              <button class="pb-2 -mb-px border-b-2 border-transparent hover:text-gray-800 {activeView==='preview-ssr' ? 'text-purple-600 border-purple-600' : 'text-gray-500'}" on:click={()=> { if(appSelectedFile?.endsWith('.svelte')) activeView='preview-ssr'; }} disabled={!appSelectedFile || !appSelectedFile.endsWith('.svelte')}>
                <i class="fas fa-eye mr-1"></i>Preview SSR
              </button>
              <button class="pb-2 -mb-px border-b-2 border-transparent hover:text-gray-800 {activeView==='preview-interactive' ? 'text-purple-600 border-purple-600' : 'text-gray-500'}" on:click={()=> { if(appSelectedFile?.endsWith('.svelte')) activeView='preview-interactive'; }} disabled={!appSelectedFile || !appSelectedFile.endsWith('.svelte')}>
                <i class="fas fa-play-circle mr-1"></i>Interactif
              </button>
              <button class="pb-2 -mb-px border-b-2 border-transparent hover:text-gray-800 {activeView==='app-nav' ? 'text-purple-600 border-purple-600' : 'text-gray-500'}" on:click={()=> { activeView='app-nav'; }} disabled={!appFiles}>
                <i class="fas fa-compass mr-1"></i>App
              </button>
            </div>
              <div class="flex items-center justify-between mt-3 mb-2 text-xs">
              <div class="flex items-center gap-2">
                <i class="fas fa-file-code text-purple-600"></i>
                <span class="font-medium truncate max-w-[240px]" title={appSelectedFile}>{appSelectedFile || 'Aucun fichier sélectionné'}</span>
              </div>
              <div class="flex items-center gap-3">
                {#if appSelectedFile}
                  <button class="text-purple-600 hover:underline" on:click={copyCurrent}>Copier</button>
                  <button class="text-gray-600 hover:underline" on:click={()=> { showCompileDebug=!showCompileDebug; compileDebugData=null; compileCache.delete(appSelectedFile); compileSelected(); }}>{showCompileDebug ? 'Debug:ON':'Debug:OFF'}</button>
                    <button class="text-gray-600 hover:underline disabled:opacity-40" disabled={!fileHistory.get(appSelectedFile)?.length} on:click={()=> showDiff=!showDiff}>{showDiff? 'Code':'Diff'}</button>
                    <button class="text-rose-600 hover:underline disabled:opacity-40" disabled={!fileHistory.get(appSelectedFile)?.length || restoring} on:click={restorePrevious}>
                      {#if restoring}<i class="fas fa-spinner fa-spin"></i>{:else}<i class="fas fa-rotate-left"></i>{/if} Restaurer
                    </button>
                    <button class="text-emerald-600 hover:underline disabled:opacity-40" disabled={!(redoStacks.get(appSelectedFile)||[]).length} on:click={redoPrevious}>
                      <i class="fas fa-share"></i> Redo
                    </button>
                    <button class="text-gray-500 hover:underline disabled:opacity-40" disabled={!fileHistory.get(appSelectedFile)?.length} on:click={()=> showHistory=!showHistory}>
                      <i class="fas fa-clock-rotate-left"></i> Historique
                    </button>
                  {#if appValidation && appValidation[appSelectedFile]?.diagnostics?.length}
                    <div class="flex items-center gap-2">
                      <button class="text-amber-600 hover:underline disabled:opacity-50" disabled={repairing || autoRepairing} on:click={repairCurrent}>
                        {#if repairing}<i class="fas fa-spinner fa-spin"></i>{:else}<i class="fas fa-wrench"></i>{/if} Réparer (IA)
                      </button>
                      <button class="text-indigo-600 hover:underline disabled:opacity-50" disabled={autoRepairing || repairing} on:click={autoRepairCurrent}>
                        {#if autoRepairing}<i class="fas fa-circle-notch fa-spin"></i>{:else}<i class="fas fa-robot"></i>{/if} Auto
                      </button>
                    </div>
                  {/if}
                {/if}
              </div>
            </div>
          </div>

          <!-- Contenu dynamique selon onglet -->
          {#if activeView==='files'}
            <div class="flex-1 overflow-auto p-4 bg-white text-xs space-y-1">
              {#if !appFiles}
                <div class="h-full flex items-center justify-center text-gray-400 text-sm text-center">
                  {#if appIsGenerating || blueprintGenerating}
                    <span class="flex items-center gap-2"><i class="fas fa-spinner fa-spin"></i> Génération en cours...</span>
                  {:else}
                    Aucune application générée pour l'instant.
                  {/if}
                </div>
              {:else}
                <div class="text-[11px] text-gray-500 mb-2">Liste des fichiers générés.</div>
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {#each Object.keys(appFiles) as f}
                    {#key f}
                      {@const meta = appValidation && appValidation[f]}
                      <button
                        class="relative group text-left px-2 py-2 rounded border text-[11px] break-all transition-colors {appSelectedFile === f ? 'bg-purple-50 border-purple-400 text-purple-700 font-medium' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'}"
                        on:click={()=> { selectFile(f); if(f.endsWith('.svelte')) activeView='code'; }}
                        title={meta && meta.diagnostics?.length ? meta.diagnostics.map(d=>d.severity+': '+d.message).join('\n') : f}
                      >
                        <div class="flex items-center gap-1">
                          {#if f.endsWith('.svelte')}
                            <span class="inline-flex items-center justify-center w-4 h-4 rounded bg-purple-600 text-white text-[9px] font-bold">S</span>
                          {/if}
                          <span class="truncate flex-1">{f}</span>
                          {#if meta}
                            {#if meta.diagnostics && meta.diagnostics.some(d=>d.severity==='error')}
                              <i class="fas fa-circle-exclamation text-red-500" title="Erreurs détectées"></i>
                            {:else if meta.ssrOk && meta.domOk}
                              <i class="fas fa-check-circle text-emerald-500" title="SSR & DOM OK"></i>
                            {:else if meta.ssrOk || meta.domOk}
                              <i class="fas fa-circle text-amber-500" title="Compilation partielle"></i>
                            {/if}
                          {/if}
                        </div>
                      </button>
                    {/key}
                  {/each}
                </div>
              {/if}
            </div>
          {:else if activeView==='code'}
            <div class="flex-1 overflow-auto bg-gray-900 text-green-300 text-[11px] p-4 font-mono leading-relaxed relative">
              {#if !appFiles}
                <div class="h-full flex items-center justify-center text-gray-500">Aucun code – lance une génération.</div>
              {:else if appSelectedFile}
                {#if showDiff}
                  {@const previous = getLastVersion(appSelectedFile)}
                  {#if previous}
                    {@const current = (appValidation && appValidation[appSelectedFile]?.formatted) || appFiles[appSelectedFile]}
                    {@const diffs = computeDiff(previous, current)}
                    <div class="mb-4 text-[11px] font-mono leading-relaxed">
                      {#each diffs as d}
                        <div class="whitespace-pre {d.type==='add' ? 'bg-green-900/30 text-green-300' : d.type==='del' ? 'bg-red-900/30 text-red-300 line-through' : 'text-gray-300'}">{d.text}</div>
                      {/each}
                    </div>
                  {:else}
                    <div class="text-gray-500 text-xs mb-4">Aucune version précédente pour diff.</div>
                  {/if}
                {:else}
                  <pre class="mb-4"><code>{(appValidation && appValidation[appSelectedFile]?.formatted) || appFiles[appSelectedFile]}</code></pre>
                {/if}
                {#if showHistory}
                  {@const hist = fileHistory.get(appSelectedFile) || []}
                  <div class="mb-4 border border-gray-700 rounded bg-gray-800/60 p-2 max-h-48 overflow-auto text-[10px] space-y-1">
                    {#if hist.length===0}
                      <div class="text-gray-400">Aucune version enregistrée.</div>
                    {:else}
                      {#each [...hist].map((h,i)=> ({...h,i})) as hObj}
                        <div class="flex items-center justify-between gap-2">
                          <span class="truncate flex-1 text-gray-300">{new Date(hObj.ts).toLocaleTimeString()} - {hObj.code.split('\n')[0]?.slice(0,40)}</span>
                          <button class="px-1.5 py-0.5 text-[10px] rounded bg-gray-700 hover:bg-gray-600" on:click={()=> restoreFromHistory(hObj.i)}>Restaurer</button>
                        </div>
                      {/each}
                    {/if}
                  </div>
                {/if}
                <div class="mt-2 text-[10px] text-gray-400 space-y-2 bg-gray-800/40 p-3 rounded border border-gray-700">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold text-gray-300">Diagnostics</span>
                    <button class="text-xs underline" on:click={()=> showDiagnostics=!showDiagnostics}>{showDiagnostics ? 'masquer' : 'afficher'}</button>
                  </div>
                  {#if repairMessage}<div class="text-amber-400">{repairMessage}</div>{/if}
                  {#if autoRepairMessage}<div class="text-indigo-400">{autoRepairMessage}</div>{/if}
                  {#if restoreMessage}<div class="text-rose-300">{restoreMessage}</div>{/if}
                  {#if showDiagnostics}
          {#if activeView==='files'}
            {#if appFiles}
              <div class="px-4 pb-3 border-t bg-gray-50 flex items-center justify-between text-[11px]">
                <div class="flex items-center gap-2 text-gray-500">
                  <i class="fas fa-triangle-exclamation"></i>
                  {#await Promise.resolve(Object.keys(appFiles).filter(f=> appValidation?.[f]?.diagnostics?.some(d=> d.severity==='error')).length) then errCount}
                    <span>{errCount} fichier(s) avec erreurs</span>
                  {/await}
                </div>
                <div class="flex items-center gap-3">
                  <button class="text-indigo-600 hover:underline disabled:opacity-40" disabled={bulkAutoRepairing} on:click={bulkAutoRepair}>{#if bulkAutoRepairing}<i class="fas fa-spinner fa-spin"></i>{:else}<i class="fas fa-robot"></i>{/if} Auto réparer tout</button>
                </div>
              </div>
              {#if bulkMessage}
                <div class="px-4 py-2 text-[10px] bg-indigo-50 text-indigo-700 border-t border-indigo-200">{bulkMessage}</div>
              {/if}
            {/if}
          {/if}
                    {#if appValidation && appValidation[appSelectedFile]}
                      {#if appValidation[appSelectedFile].diagnostics.length === 0}
                        <div class="text-emerald-400">Aucun diagnostic.</div>
                      {:else}
                        <ul class="space-y-1 max-h-56 overflow-auto pr-1">
                          {#each appValidation[appSelectedFile].diagnostics as d, i}
                            <li class="rounded px-2 py-1 bg-gray-800/60 border border-gray-700 flex gap-2 items-start">
                              <span class="uppercase text-[9px] mt-0.5 tracking-wide {d.severity==='error' ? 'text-red-400' : d.severity==='warning' ? 'text-amber-300' : 'text-gray-400'}">{d.severity}</span>
                              <span class="flex-1 leading-snug">{d.message}</span>
                              <div class="flex flex-col items-end gap-0.5 text-[9px] text-gray-500">
                                {#if d.rule}<span>{d.rule}</span>{/if}
                                {#if d.line}<span>L{d.line}</span>{/if}
                              </div>
                            </li>
                          {/each}
                        </ul>
                      {/if}
                    {/if}
                  {/if}
                </div>
              {:else}
                <div class="h-full flex items-center justify-center text-gray-500">Sélectionne un fichier dans l'onglet Fichiers.</div>
              {/if}
            </div>
          {:else if activeView==='preview-ssr'}
            <div class="flex-1 bg-white relative">
              {#if !appFiles}
                <div class="h-full flex items-center justify-center text-gray-500 text-xs">Aucun rendu – génère d'abord une application.</div>
              {:else if !appSelectedFile}
                <div class="h-full flex items-center justify-center text-gray-500 text-xs">Aucun fichier sélectionné.</div>
              {:else if !appSelectedFile.endsWith('.svelte')}
                <div class="h-full flex items-center justify-center text-gray-500 text-xs">Le rendu SSR n'est disponible que pour les fichiers .svelte</div>
              {:else}
                {#if compiling && !compileUrl}
                  <div class="h-full flex items-center justify-center text-gray-500 text-xs gap-2"><i class="fas fa-spinner fa-spin"></i> Compilation...</div>
                {:else if compileUrl && compileUrl.startsWith('error:')}
                  <div class="p-4 text-xs text-red-600 bg-red-50 h-full overflow-auto">{compileUrl.slice(6)}</div>
                {:else if compileUrl}
                    <div class="w-full h-full">
                      <iframe title="Rendu SSR" src={compileUrl} class="absolute inset-0 w-full h-full bg-white"></iframe>
                      {#if showCompileDebug && compileDebugData}
                        <div class="absolute bottom-2 left-2 max-w-md text-[10px] bg-gray-900/90 text-gray-100 rounded shadow-lg p-3 space-y-2 border border-gray-700 overflow-auto max-h-60">
                          <div class="flex items-center justify-between">
                            <span class="font-semibold">Debug Compilation</span>
                            <button class="text-xs underline" on:click={()=> compileDebugData=null}>clear</button>
                          </div>
                          <div class="grid grid-cols-2 gap-2">
                            <div>
                              <div class="text-gray-400">Meta</div>
                              <pre class="whitespace-pre-wrap text-[9px] overflow-auto">{JSON.stringify(compileDebugData.meta,null,2)}</pre>
                            </div>
                            <div>
                              <div class="text-gray-400">Dépendances</div>
                              <pre class="whitespace-pre-wrap text-[9px] overflow-auto">{JSON.stringify(compileDebugData.dependencies,null,2)}</pre>
                            </div>
                          </div>
                          <details>
                            <summary class="cursor-pointer text-emerald-300">SSR JS (original)</summary>
                            <pre class="text-[9px] overflow-auto max-h-40">{compileDebugData.ssrJs}</pre>
                          </details>
                          <details>
                            <summary class="cursor-pointer text-amber-300">SSR JS (transformé)</summary>
                            <pre class="text-[9px] overflow-auto max-h-40">{compileDebugData.ssrTransformed}</pre>
                          </details>
                          <details>
                            <summary class="cursor-pointer text-indigo-300">DOM JS</summary>
                            <pre class="text-[9px] overflow-auto max-h-40">{compileDebugData.domJs}</pre>
                          </details>
                          {#if compileDebugData.css}
                            <details>
                              <summary class="cursor-pointer text-pink-300">CSS Principal</summary>
                              <pre class="text-[9px] overflow-auto max-h-40">{compileDebugData.css}</pre>
                            </details>
                          {/if}
                          {#if compileDebugData.depCss?.length}
                            <details open>
                              <summary class="cursor-pointer text-cyan-300">CSS Dépendances ({compileDebugData.depCss.length})</summary>
                              {#each compileDebugData.depCss as c,i}
                                <pre class="text-[9px] overflow-auto max-h-28 border border-gray-700 p-1 rounded">/* dep {i+1} */\n{c}</pre>
                              {/each}
                            </details>
                          {/if}
                        </div>
                      {/if}
                      {#if stubbedComponents.length}
                        <div class="absolute top-2 right-2 max-w-xs text-[10px] bg-amber-50 border border-amber-300 text-amber-800 rounded shadow p-2 space-y-1">
                          <div class="font-semibold flex items-center justify-between gap-2">
                            <span class="flex items-center gap-1"><i class="fas fa-puzzle-piece"></i> Composants stubés</span>
                            <button class="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[9px] disabled:opacity-50" disabled={generatingAll} on:click={generateAllStubComponents}>
                              {#if generatingAll}<i class="fas fa-spinner fa-spin"></i>{:else}Tous{/if}
                            </button>
                          </div>
                          <ul class="space-y-0.5">
                            {#each stubbedComponents as sc}
                              <li class="flex items-center justify-between gap-2 bg-white/60 rounded px-1 py-0.5 border border-amber-200" title={sc}>
                                <span class="truncate">{sc}</span>
                                <button class="px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[9px] disabled:opacity-50" disabled={generatingStub && generatingStub!==sc} on:click={()=> generateStubComponent(sc)}>
                                  {#if generatingStub===sc}<i class="fas fa-spinner fa-spin"></i>{:else}<i class="fas fa-wand-magic-sparkles"></i>{/if}
                                </button>
                              </li>
                            {/each}
                          </ul>
                          <div class="text-[9px] text-amber-600">Clique pour générer automatiquement.</div>
                        </div>
                      {/if}
                    </div>
                {/if}
              {/if}
            </div>
          {:else if activeView==='preview-interactive'}
            <div class="flex-1 bg-white relative">
              {#if !appFiles}
                <div class="h-full flex items-center justify-center text-gray-500 text-xs">Aucun sandbox – génère d'abord une application.</div>
              {:else if !appSelectedFile}
                <div class="h-full flex items-center justify-center text-gray-500 text-xs">Aucun fichier sélectionné.</div>
              {:else if !appSelectedFile.endsWith('.svelte')}
                <div class="h-full flex items-center justify-center text-gray-500 text-xs">Mode interactif seulement pour .svelte</div>
              {:else}
                {#if interactiveLoading && !interactiveUrl}
                  <div class="h-full flex items-center justify-center text-gray-500 text-xs gap-2"><i class="fas fa-spinner fa-spin"></i> Construction sandbox...</div>
                {:else if interactiveUrl && interactiveUrl.startsWith('error:')}
                  <div class="p-4 text-xs text-red-600 bg-red-50 h-full overflow-auto">{interactiveUrl.slice(6)}</div>
                {:else if interactiveUrl}
                  <iframe title="Sandbox Interactif" sandbox="allow-scripts" src={interactiveUrl} class="absolute inset-0 w-full h-full bg-white"></iframe>
                {/if}
              {/if}
            </div>
          {:else if activeView==='app-nav'}
            <div class="flex-1 bg-white relative flex flex-col">
              {#if !appFiles}
                <div class="flex-1 flex items-center justify-center text-gray-500 text-xs">Génère une application pour naviguer.</div>
              {:else}
                <div class="border-b bg-gray-50 px-3 py-2 flex items-center gap-2 text-[11px]">
                  <span class="font-semibold text-gray-600 flex items-center gap-1"><i class="fas fa-compass text-purple-600"></i> Navigation</span>
                  <input class="px-2 py-1 border rounded text-xs" bind:value={appNavPath} placeholder="/" on:keydown={(e)=> { if(e.key==='Enter') loadAppRoute(appNavPath||'/'); }} />
                  <button class="px-2 py-1 rounded bg-purple-600 text-white text-xs disabled:opacity-50" on:click={()=> loadAppRoute(appNavPath||'/')} disabled={appNavLoading}>Go</button>
                  {#if appNavLoading}<i class="fas fa-spinner fa-spin text-purple-600"></i>{/if}
                  {#if appNavError}<span class="text-red-600 truncate">{appNavError}</span>{/if}
                  <div class="ml-auto flex items-center gap-2 text-gray-500">
                    {#if appAvailableRoutes.length}
                      <select class="border rounded text-xs px-1 py-0.5" on:change={(e)=> loadAppRoute(e.target.value)}>
                        <option disabled selected>Routes</option>
                        {#each appAvailableRoutes as r}<option value={r}>{r}</option>{/each}
                      </select>
                    {/if}
                  </div>
                </div>
                {#if appNavUrl}
                  <iframe title="App Preview" src={appNavUrl} class="flex-1 w-full h-full"></iframe>
                {:else}
                  <div class="flex-1 flex items-center justify-center text-gray-400 text-xs">Aucune route chargée.</div>
                {/if}
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  textarea { font-family: inherit; }
  pre { white-space: pre; }
</style>