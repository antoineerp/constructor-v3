// 🛡️ Configuration de sécurité partagée pour l'exécution de code
// Centralise toutes les règles de sécurité pour éviter la duplication

export const SECURITY_CONFIG = {
  // Patterns dangereux interdits dans le code source
  DANGEROUS_PATTERNS: [
    { pattern: /require\s*\(/g, message: 'require() calls not allowed' },
    { pattern: /import\s+.*\s+from\s+['"](?!\.|\$lib|svelte)/g, message: 'External imports not allowed' },
    { pattern: /process\./g, message: 'Process access not allowed' },
    { pattern: /fs\./g, message: 'File system access not allowed' },
    { pattern: /child_process/g, message: 'Child process access not allowed' },
    { pattern: /eval\s*\(/g, message: 'eval() not allowed' },
    { pattern: /Function\s*\(/g, message: 'Function constructor not allowed' },
    { pattern: /globalThis/g, message: 'Global object access not allowed' },
    { pattern: /window\./g, message: 'Window object access not allowed in SSR' },
    { pattern: /__dirname|__filename/g, message: 'Path constants not allowed' },
    { pattern: /\.\.\/|\.\.\\./g, message: 'Path traversal not allowed' },
    { pattern: /\/etc\/|\/proc\/|\/sys\//g, message: 'System paths not allowed' }
  ],

  // Limites de taille
  MAX_SOURCE_SIZE: 50000, // 50KB par fichier
  MAX_CONFIG_SIZE: 10000, // 10KB pour configs Tailwind
  MAX_CACHE_SIZE: 50, // Maximum d'entrées en cache
  
  // Timeouts
  SSR_TIMEOUT_MS: 3000, // 3s max pour le rendu SSR
  TAILWIND_TIMEOUT_MS: 8000, // 8s max pour Tailwind
  
  // Cache TTL
  CACHE_TTL_MS: 30 * 1000, // 30s pour les previews
  CSS_CACHE_TTL_MS: 2 * 60 * 1000, // 2min pour CSS
  
  // Environnement
  SSR_ENABLED: process.env.NODE_ENV !== 'production' // Désactiver SSR en production
};

// 🛡️ Validation du code source contre les patterns dangereux
export function validateSourceSecurity(source, filename = 'unknown') {
  // Vérification de taille
  if (source.length > SECURITY_CONFIG.MAX_SOURCE_SIZE) {
    throw new Error(`Source code too large: ${source.length} chars (max ${SECURITY_CONFIG.MAX_SOURCE_SIZE})`);
  }
  
  // Vérification des patterns dangereux
  for (const { pattern, message } of SECURITY_CONFIG.DANGEROUS_PATTERNS) {
    if (pattern.test(source)) {
      throw new Error(`Security violation in ${filename}: ${message}`);
    }
  }
}

// 🛡️ Validation des configurations Tailwind
export function validateTailwindConfig(configContent) {
  if (configContent.length > SECURITY_CONFIG.MAX_CONFIG_SIZE) {
    throw new Error(`Tailwind config too large: ${configContent.length} chars`);
  }
  
  const configPatterns = [
    /require\s*\(/,
    /import\s+/,
    /process\./,
    /fs\./,
    /child_process/,
    /eval\s*\(/,
    /Function\s*\(/,
    /\.\.\/|\.\.\\/, // Path traversal
    /\/etc\/|\/proc\/|\/sys\//, // System paths
    /exec|spawn|fork/, // Process execution
  ];
  
  for (const pattern of configPatterns) {
    if (pattern.test(configContent)) {
      throw new Error('Tailwind config contains unsafe patterns');
    }
  }
}

// 🧹 Nettoyage des imports Svelte legacy
export function cleanSvelteLegacyImports(code) {
  return code
    .replace(/from ['"]svelte\/legacy['"]/g, 'from "svelte"')
    .replace(/import ['"]svelte\/legacy['"]/g, 'import "svelte"')
    .replace(/from ['"]svelte\/legacy\/(.+?)['"]/g, 'from "svelte/$1"');
}

// 🕒 Utilitaire de timeout pour les opérations async
export function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

// 🔒 Création d'un require restreint pour SSR
export function createRestrictedRequire() {
  return (moduleName) => {
    const allowedModules = [
      'svelte/internal',
      'svelte/store', 
      'svelte/motion',
      'svelte/transition',
      'svelte/easing'
    ];
    
    if (allowedModules.includes(moduleName)) {
      try {
        return require(moduleName);
      } catch (e) {
        console.warn(`[security] Failed to require allowed module: ${moduleName}`, e.message);
        return {}; // Fallback vide
      }
    }
    
    throw new Error(`Module not allowed: ${moduleName}`);
  };
}

// 📊 Logging sécurisé (évite les fuites d'infos sensibles)
export function secureLog(level, context, data) {
  const safeData = {
    ...data,
    // Masquer les données sensibles
    stack: process.env.NODE_ENV === 'development' ? data.stack : '[hidden]',
    source: data.source ? '[source code hidden]' : undefined,
    config: data.config ? '[config hidden]' : undefined
  };
  
  console[level](`[security/${context}]`, safeData);
}