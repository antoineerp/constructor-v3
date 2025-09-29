import { json } from '@sveltejs/kit';

/* Endpoint de patch incrémental simple (offline-friendly)
   POST /api/blueprint/patch
   Body: {
     files: { [path:string]: string },           // ensemble de base
     operations: [                               // opérations à appliquer
       { op: 'add'|'update', path: string, content: string },
       { op: 'remove', path: string }
     ],
     validate?: boolean                          // (placeholder) future validation server side
   }
   Réponse: { success, files, applied:[...], errors:[...]} */

export async function POST({ request }) {
  try {
    const body = await request.json().catch(()=> ({}));
    const { files: baseFiles = {}, operations = [], validate = false } = body;
    if(typeof baseFiles !== 'object' || Array.isArray(baseFiles)){
      return json({ success:false, error:'Format files invalide' }, { status:400 });
    }
    if(!Array.isArray(operations)){
      return json({ success:false, error:'operations doit être un tableau' }, { status:400 });
    }
    const files = { ...baseFiles }; // copie mutable
    const applied = []; const errors = [];
    for(const [idx,op] of operations.entries()){
      if(!op || !op.op || !op.path){ errors.push({ index: idx, error:'Opération mal formée' }); continue; }
      try {
        if(op.op === 'remove'){
          if(files[op.path] == null){ errors.push({ index: idx, error:'Fichier inexistant' }); continue; }
          delete files[op.path]; applied.push({ index: idx, op: 'remove', path: op.path });
        } else if(op.op === 'add' || op.op === 'update'){
          if(typeof op.content !== 'string'){ errors.push({ index: idx, error:'Content requis (string)' }); continue; }
          const isAdd = !files.hasOwnProperty(op.path);
          files[op.path] = op.content;
          applied.push({ index: idx, op: isAdd ? 'add':'update', path: op.path });
        } else {
          errors.push({ index: idx, error:'Opération inconnue '+op.op });
        }
      } catch(e){ errors.push({ index: idx, error: e.message }); }
    }

    // Placeholder validation future (lint / svelte compile). Gardé simple pour ne pas alourdir.
    let validation = null;
    if(validate){
      validation = Object.keys(files).reduce((acc,k)=>{ acc[k] = { ok:true }; return acc; }, {});
    }
    return json({ success:true, files, applied, errors, validation });
  } catch(e){
    return json({ success:false, error:e.message||'Erreur patch' }, { status:500 });
  }
}
