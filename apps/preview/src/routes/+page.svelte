<script>
	import { onMount } from 'svelte';
	
	let previewContent = 'Contenu de preview dynamique...';
	let isLoading = true;

	onMount(() => {
		// Simulation du chargement d'un projet généré
		setTimeout(() => {
			isLoading = false;
			previewContent = 'Application générée chargée avec succès !';
		}, 1000);
	});
</script>

<svelte:head>
	<title>Constructor V3 - Preview</title>
</svelte:head>

<main class="h-screen w-full bg-gray-50">
	{#if isLoading}
		<div class="flex items-center justify-center h-full">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
			<span class="ml-4 text-lg text-gray-600">Chargement de la preview...</span>
		</div>
	{:else}
		<div class="h-full p-8">
			<div class="bg-white rounded-lg shadow-lg h-full p-6">
				<h1 class="text-3xl font-bold mb-6 text-center">Preview - Application Générée</h1>
				
				<div class="grid gap-6">
					<section class="bg-blue-50 rounded-lg p-4">
						<h2 class="text-xl font-semibold mb-2">Environnement de Preview Isolé</h2>
						<p class="text-gray-700">{previewContent}</p>
					</section>

					<section class="bg-green-50 rounded-lg p-4">
						<h2 class="text-xl font-semibold mb-2">Hot Reloading Activé</h2>
						<p class="text-gray-700">Les modifications sont appliquées en temps réel.</p>
					</section>

					<section class="bg-yellow-50 rounded-lg p-4">
						<h2 class="text-xl font-semibold mb-2">Sandbox Sécurisé</h2>
						<p class="text-gray-700">Environnement isolé pour l'exécution sécurisée du code généré.</p>
					</section>

					<!-- Exemple de contenu généré dynamiquement -->
					<section class="bg-purple-50 rounded-lg p-4">
						<h2 class="text-xl font-semibold mb-2">Exemple de Composant Généré</h2>
						<div class="space-y-2">
							<button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
								Bouton d'Exemple
							</button>
							<div class="bg-white border rounded p-3">
								<p class="font-medium">Carte d'Exemple</p>
								<p class="text-sm text-gray-600">Contenu de la carte générée par l'IA</p>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	{/if}
</main>

<style>
	/* Styles Tailwind seront appliqués */
</style>