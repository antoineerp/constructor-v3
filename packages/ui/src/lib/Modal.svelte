<script>
	export let open = false;
	export let title = '';
	export let maxWidth = 'md';

	function close() {
		open = false;
	}

	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			close();
		}
	}

	$: maxWidthClass = {
		'sm': 'max-w-sm',
		'md': 'max-w-md',
		'lg': 'max-w-lg',
		'xl': 'max-w-xl',
		'2xl': 'max-w-2xl',
		'full': 'max-w-full'
	}[maxWidth];
</script>

{#if open}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
		on:click={handleBackdropClick}
		role="dialog"
		aria-modal="true"
	>
		<!-- Modal -->
		<div class="bg-white rounded-lg shadow-xl {maxWidthClass} w-full">
			<!-- Header -->
			{#if title || $$slots.header}
				<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
					<slot name="header">
						<h2 class="text-xl font-semibold text-gray-900">{title}</h2>
					</slot>
					<button 
						class="text-gray-400 hover:text-gray-600 transition-colors"
						on:click={close}
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>
			{/if}

			<!-- Body -->
			<div class="px-6 py-4">
				<slot />
			</div>

			<!-- Footer -->
			{#if $$slots.footer}
				<div class="px-6 py-4 border-t border-gray-200">
					<slot name="footer" />
				</div>
			{/if}
		</div>
	</div>
{/if}