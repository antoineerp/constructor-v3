<script>
  import { onMount } from 'svelte';

  import Button from '$lib/Button.svelte';
  import Card from '$lib/Card.svelte';
  import { supabase } from '$lib/supabase.js';
  
  let connectionStatus = 'testing';
  let connectionMessage = '';
  let templates = [];
  let components = [];
  let projects = [];
  
  // Variables pour les tests
  let supabaseUrl = '';
  let supabaseKey = '';
  
  onMount(async () => {
    await testConnection();
  });
  
  async function testConnection() {
    try {
      connectionStatus = 'testing';
      connectionMessage = 'Test de connexion en cours...';
      
      // Test de connexion basique - utiliser count() correct pour Supabase
      const { count: healthCheck, error: healthError } = await supabase
        .from('templates')
        .select('*', { count: 'exact', head: true });
        
      if (healthError) {
        throw healthError;
      }
      
      // Récupérer les données de test
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('*')
        .limit(5);
        
      const { data: componentsData, error: componentsError } = await supabase
        .from('components')
        .select('*')
        .limit(5);
        
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .limit(5);
      
      if (templatesError || componentsError) {
        throw new Error('Erreur lors de la récupération des données');
      }
      
      templates = templatesData || [];
      components = componentsData || [];
      projects = projectsData || [];
      
      connectionStatus = 'success';
      connectionMessage = `✅ Connexion réussie ! ${templates.length} templates, ${components.length} composants trouvés.`;
      
    } catch (error) {
      connectionStatus = 'error';
      connectionMessage = `❌ Erreur de connexion : ${error.message}`;
      console.error('Erreur Supabase:', error);
    }
  }
  
  async function testCreate() {
    try {
      // Test de création d'un projet
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            name: 'Test Project',
            description: 'Projet de test de connexion',
            prompt_original: 'Créer une application de test',
            code_generated: { message: 'Code généré pour test' },
            status: 'draft'
          }
        ])
        .select();
        
      if (error) throw error;
      
      alert('✅ Test de création réussi !');
      await testConnection(); // Refresh les données
      
    } catch (error) {
      alert(`❌ Erreur lors du test de création : ${error.message}`);
    }
  }
</script>

<svelte:head>
  <title>Configuration Supabase - Constructor V3</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-6xl mx-auto px-4">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Configuration Supabase</h1>
      <p class="text-gray-600">Test et configuration de votre base de données Supabase</p>
    </div>
    
    <!-- Statut de connexion -->
    <Card title="Statut de la Connexion" class="mb-8">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          {#if connectionStatus === 'testing'}
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          {:else if connectionStatus === 'success'}
            <div class="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          {:else}
            <div class="h-6 w-6 bg-red-500 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </div>
          {/if}
          <span class="text-lg font-medium">{connectionMessage}</span>
        </div>
        
        <div class="flex space-x-2">
          <Button variant="secondary" on:click={testConnection}>
            Retester
          </Button>
          <Button on:click={testCreate} disabled={connectionStatus !== 'success'}>
            Test de Création
          </Button>
        </div>
      </div>
    </Card>
    
    <!-- Configuration -->
    {#if connectionStatus === 'error'}
      <Card title="Configuration" class="mb-8">
        <div class="space-y-4">
          <p class="text-red-600 mb-4">
            ❌ Impossible de se connecter à Supabase. Vérifiez votre configuration dans le fichier <code class="bg-gray-100 px-2 py-1 rounded">.env</code>
          </p>
          
          <div class="bg-gray-100 p-4 rounded-lg">
            <h4 class="font-medium mb-2">Étapes pour configurer Supabase :</h4>
            <ol class="list-decimal list-inside space-y-1 text-sm">
              <li>Allez sur <a href="https://app.supabase.com/" class="text-blue-600 hover:underline" target="_blank">app.supabase.com</a></li>
              <li>Créez un nouveau projet ou sélectionnez un projet existant</li>
              <li>Allez dans Settings → API</li>
              <li>Copiez votre Project URL et anon/public key</li>
              <li>Mettez à jour le fichier <code>.env</code> avec ces valeurs</li>
              <li>Exécutez le script SQL <code>supabase-schema.sql</code> dans l'éditeur SQL de Supabase</li>
              <li>Exécutez le script SQL <code>supabase-data.sql</code> pour les données de test</li>
            </ol>
          </div>
        </div>
      </Card>
    {/if}
    
    <!-- Données de test -->
    {#if connectionStatus === 'success'}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Templates -->
        <Card title="Templates Disponibles" subtitle={`${templates.length} templates trouvés`}>
          <div class="space-y-3">
            {#each templates as template}
              <div class="p-3 bg-gray-50 rounded-lg">
                <div class="font-medium text-sm">{template.name}</div>
                <div class="text-xs text-gray-600">{template.type}</div>
                <div class="text-xs text-gray-500 mt-1">{template.description}</div>
              </div>
            {/each}
            {#if templates.length === 0}
              <p class="text-gray-500 text-sm">Aucun template trouvé. Exécutez le script <code>supabase-data.sql</code>.</p>
            {/if}
          </div>
        </Card>
        
        <!-- Composants -->
        <Card title="Composants Disponibles" subtitle={`${components.length} composants trouvés`}>
          <div class="space-y-3">
            {#each components as component}
              <div class="p-3 bg-gray-50 rounded-lg">
                <div class="font-medium text-sm">{component.name}</div>
                <div class="text-xs text-gray-600">{component.category} • {component.type}</div>
              </div>
            {/each}
            {#if components.length === 0}
              <p class="text-gray-500 text-sm">Aucun composant trouvé. Exécutez le script <code>supabase-data.sql</code>.</p>
            {/if}
          </div>
        </Card>
        
        <!-- Projets -->
        <Card title="Projets Récents" subtitle={`${projects.length} projets trouvés`}>
          <div class="space-y-3">
            {#each projects as project}
              <div class="p-3 bg-gray-50 rounded-lg">
                <div class="font-medium text-sm">{project.name}</div>
                <div class="text-xs text-gray-600">{project.status}</div>
                <div class="text-xs text-gray-500 mt-1">{project.description}</div>
              </div>
            {/each}
            {#if projects.length === 0}
              <p class="text-gray-500 text-sm">Aucun projet trouvé.</p>
            {/if}
          </div>
        </Card>
      </div>
    {/if}
    
    <!-- Instructions détaillées -->
    <Card title="Instructions Détaillées" class="mt-8">
      <div class="prose prose-sm max-w-none">
        <h4>1. Configuration de Supabase</h4>
        <p>Pour connecter votre application à Supabase :</p>
        <ul>
          <li>Créez un compte sur <a href="https://app.supabase.com/" target="_blank" class="text-blue-600 hover:underline">app.supabase.com</a></li>
          <li>Créez un nouveau projet (choisissez la région la plus proche)</li>
          <li>Attendez que le projet soit initialisé (2-3 minutes)</li>
        </ul>
        
        <h4>2. Récupération des clés API</h4>
        <p>Dans votre dashboard Supabase :</p>
        <ul>
          <li>Allez dans <strong>Settings → API</strong></li>
          <li>Copiez la <strong>Project URL</strong></li>
          <li>Copiez la clé <strong>anon public</strong></li>
          <li>Optionnel : Copiez la clé <strong>service_role</strong> (pour les opérations admin)</li>
        </ul>
        
        <h4>3. Configuration du fichier .env</h4>
        <p>Mettez à jour le fichier <code>.env</code> dans la racine du projet :</p>
        <pre><code>SUPABASE_URL=https://votre-projet.supabase.co
PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</code></pre>
        
        <h4>4. Initialisation de la base de données</h4>
        <p>Dans l'éditeur SQL de Supabase :</p>
        <ol>
          <li>Allez dans <strong>SQL Editor</strong></li>
          <li>Créez une nouvelle requête</li>
          <li>Copiez-collez le contenu du fichier <code>supabase-schema.sql</code></li>
          <li>Exécutez la requête</li>
          <li>Répétez avec le fichier <code>supabase-data.sql</code> pour les données de test</li>
        </ol>
        
        <h4>5. Vérification</h4>
        <p>Après configuration :</p>
        <ul>
          <li>Rechargez cette page</li>
          <li>Le statut devrait afficher "✅ Connexion réussie"</li>
          <li>Vous devriez voir les templates et composants de test</li>
        </ul>
      </div>
    </Card>
  </div>
</div>

<style>
  code {
    background: #f3f4f6; /* gray-100 */
    padding: 0.25rem 0.5rem; /* px-2 py-1 */
    border-radius: 0.375rem; /* rounded */
    font-size: 0.875rem; /* text-sm */
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  pre code {
    display: block;
    background: #1f2937; /* gray-800 */
    color: #f3f4f6; /* gray-100 */
    padding: 1rem; /* p-4 */
    border-radius: 0.5rem; /* rounded-lg */
    overflow-x: auto;
  }
  .prose ul, .prose ol { padding-left: 1.5rem; }
  .prose li { margin-bottom: 0.25rem; }
  .prose h4 { font-size: 1.125rem; font-weight:600; color:#111827; margin-top:1.5rem; margin-bottom:0.5rem; }
  .prose p { margin-bottom:0.75rem; color:#374151; }
</style>