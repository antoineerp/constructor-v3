<script>
	export let title = 'Constructor V3';
	export let showNavigation = true;

	let navigationItems = [
		{ name: 'Projets', href: '/', icon: 'folder' },
		{ name: 'Templates', href: '/templates', icon: 'layout' },
		{ name: 'Composants', href: '/components', icon: 'package' },
		{ name: 'Paramètres', href: '/settings', icon: 'settings' }
	];
</script>

<header class="bg-white shadow-sm border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-16">
			<!-- Logo/Title -->
			<div class="flex items-center">
				<h1 class="text-xl font-bold text-gray-900">{title}</h1>
			</div>

			<!-- Navigation -->
			{#if showNavigation}
				<nav class="hidden md:flex space-x-8">
					{#each navigationItems as item}
						<a 
							href={item.href}
							class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
						>
							{item.name}
						</a>
					{/each}
				</nav>
			{/if}

			<!-- Right side -->
			<div class="flex items-center space-x-4">
				<slot name="actions" />
				
				<!-- User menu placeholder -->
				<div class="relative">
					<button class="bg-gray-800 flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
						<span class="sr-only">Ouvrir menu utilisateur</span>
						<div class="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
							<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
							</svg>
						</div>
					</button>
				</div>
			</div>
		</div>
	</div>
</header>