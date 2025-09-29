<script>let mode='login'; let data={email:'',password:''}; function toggle(){mode= mode==='login'?'register':'login';}</script>
<div class="max-w-sm mx-auto border rounded p-6 bg-white shadow-sm">
  <h2 class="text-lg font-semibold mb-4">{mode==='login'?'Connexion':'Créer un compte'}</h2>
  <form class="space-y-3">
    <div>
      <label for="auth-email" class="text-xs font-medium">Email</label>
      <input id="auth-email" type="email" bind:value={data.email} required class="w-full px-3 py-2 border rounded mt-1" />
    </div>
    <div>
      <label for="auth-password" class="text-xs font-medium">Mot de passe</label>
      <input id="auth-password" type="password" bind:value={data.password} required class="w-full px-3 py-2 border rounded mt-1" />
    </div>
    <button type="button" class="w-full py-2 rounded bg-indigo-600 text-white text-sm">{mode==='login'?'Se connecter':'Créer un compte'}</button>
  </form>
  <button class="mt-4 text-xs text-indigo-600 hover:underline" on:click={toggle}>{mode==='login'?'Nouveau ? Créer un compte':'Déjà un compte ? Connexion'}</button>
</div>
