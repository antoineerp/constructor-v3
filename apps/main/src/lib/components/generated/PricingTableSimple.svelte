<script>export let plans=[{name:'Starter',price:'$9',features:['1 project','Email support']},{name:'Pro',price:'$29',features:['Unlimited projects','Priority support','Team features']},{name:'Enterprise',price:'$99',features:['Custom SLAs','Dedicated manager','SAML SSO']}];</script>
<section class="py-12">
  <h2 class="text-2xl font-bold text-center mb-8">Tarifs</h2>
  <div class="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
    {#each plans as p,i}
      <div class="border rounded-lg p-6 bg-white shadow-sm flex flex-col">
        <h3 class="font-semibold text-lg mb-2">{p.name}</h3>
        <div class="text-3xl font-bold mb-4">{p.price}<span class="text-base font-normal text-gray-500">/mo</span></div>
        <ul class="text-sm space-y-1 flex-1 mb-4">
          {#each p.features as f}<li class="flex items-start"><span class="text-indigo-600 mr-1">✓</span>{f}</li>{/each}
        </ul>
        <button class="mt-auto w-full py-2 rounded bg-indigo-600 text-white text-sm">Choisir</button>
      </div>
    {/each}
  </div>
</section>
