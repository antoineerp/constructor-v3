#!/usr/bin/env node
/**
 * Lance un serveur Vite éphémère pour visualiser un bundle généré (fichiers JSON déjà produits).
 * Idée: on copie les fichiers générés (ex: exports/blueprints/...-code) dans un dossier .tmp-app et on monte un mini project SvelteKit.
 * Simplifié: si aucun argument, crée un projet minimal.
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const target = process.argv[2]; // chemin vers dossier code généré
const root = path.join(process.cwd(), '.tmp-app');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });

function write(file, content){
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

// package minimal
write('package.json', JSON.stringify({
  name: 'temp-generated-app', private: true, type: 'module',
  scripts: { dev: 'vite dev', build: 'vite build', preview: 'vite preview' },
  devDependencies: { svelte: '^5.0.0', '@sveltejs/kit': '^2.5.0', '@sveltejs/vite-plugin-svelte': '^4.0.0', vite: '^5.4.0', 'tailwindcss': '^3.4.17', autoprefixer: '^10.4.21', postcss: '^8.4.31' }
}, null, 2));
write('svelte.config.js', `import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';\nexport default { preprocess: vitePreprocess() };`);
write('vite.config.js', `import { sveltekit } from '@sveltejs/kit/vite';\nexport default { plugins:[sveltekit()] };`);
write('postcss.config.cjs', `module.exports={ plugins:{ tailwindcss:{}, autoprefixer:{} } };`);
write('tailwind.config.cjs', `module.exports={ content:['./src/**/*.{svelte,js,ts}'] };`);
write('src/app.css', `@tailwind base;@tailwind components;@tailwind utilities;`);
write('src/routes/+layout.svelte', `<script>export let data; </script><slot />`);

if(target && fs.existsSync(target)){
  // recopier arborescence
  const files = fs.readdirSync(target, { withFileTypes: true });
  function copyDir(dir, rel=''){
    for(const entry of fs.readdirSync(dir, { withFileTypes: true })){
      const p = path.join(dir, entry.name);
      const r = path.join(rel, entry.name);
      if(entry.isDirectory()) copyDir(p, r); else {
        const dest = path.join(root, r);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(p, dest);
      }
    }
  }
  copyDir(target);
  console.log('Code généré copié depuis', target);
} else {
  write('src/routes/+page.svelte', `<h1 class='p-10 text-2xl'>Temp App Vide</h1>`);
}

console.log('Installation dépendances (pnpm)...');
const install = spawn('pnpm', ['install'], { cwd: root, stdio: 'inherit' });
install.on('exit', (code)=> {
  if(code!==0){ console.error('Echec install'); process.exit(code); }
  console.log('Démarrage Vite sur temp app...');
  const dev = spawn('pnpm', ['dev','--','--port','5199'], { cwd: root, stdio: 'inherit' });
  dev.on('exit', c => process.exit(c));
});
