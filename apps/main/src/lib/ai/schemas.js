// Schémas JSON (version légère) + validateurs minimaux sans dépendance externe.
// Objectif: vérifier structure de base avant exploitation.

export const blueprintSchema = {
  required: [
    'original_query','detected_site_type','audience','goals','keywords','seo_meta',
    'color_palette','routes','core_components','data_models','sample_content','generation_strategy','recommended_prompts'
  ]
};

export function validateBlueprint(obj){
  const errors = [];
  if(typeof obj !== 'object' || obj === null || Array.isArray(obj)) errors.push('Root doit être un objet');
  else {
    for(const k of blueprintSchema.required){
      if(!(k in obj)) errors.push(`Champ manquant: ${k}`);
    }
    if(obj.routes && !Array.isArray(obj.routes)) errors.push('routes doit être array');
    if(obj.core_components && !Array.isArray(obj.core_components)) errors.push('core_components doit être array');
    if(obj.color_palette && !Array.isArray(obj.color_palette)) errors.push('color_palette doit être array');
    if(obj.goals && !Array.isArray(obj.goals)) errors.push('goals doit être array');
    if(obj.keywords && !Array.isArray(obj.keywords)) errors.push('keywords doit être array');
    if(obj.sample_content && typeof obj.sample_content !== 'object') errors.push('sample_content doit être objet');
    if(obj.recommended_prompts){
      if(typeof obj.recommended_prompts !== 'object') errors.push('recommended_prompts doit être objet');
      else if(!Array.isArray(obj.recommended_prompts.per_file)) errors.push('recommended_prompts.per_file doit être array');
    }
  }
  return { ok: errors.length === 0, errors };
}

// Application files: objet { filename: string (contenu non vide) }
export function validateApplicationFiles(obj){
  const errors = [];
  if(typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    errors.push('Root doit être un objet de fichiers');
  } else {
    const entries = Object.entries(obj);
    if(!entries.length) errors.push('Aucun fichier');
    for(const [k,v] of entries){
      if(typeof v !== 'string' || !v.trim()) errors.push(`Fichier ${k} contenu vide`);
      if(/\0/.test(v)) errors.push(`Fichier ${k} contient caractères nuls`);
      if(k.length > 160) errors.push(`Nom fichier trop long: ${k}`);
      if(!/^([A-Za-z0-9_./-]+)*/.test(k)) errors.push(`Nom fichier invalide: ${k}`);
    }
  }
  return { ok: errors.length === 0, errors };
}
