<script>
	import { clsx } from 'clsx';

	/** @type {'primary' | 'secondary' | 'danger' | 'success'} */
	export let variant = 'primary';
	
	/** @type {'sm' | 'md' | 'lg'} */
	export let size = 'md';
	
	export let disabled = false;
	export let loading = false;

	$: classes = clsx(
		'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
		{
			// Variants
			'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500': variant === 'primary',
			'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-500': variant === 'secondary',
			'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500': variant === 'danger',
			'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500': variant === 'success',
			
			// Sizes
			'h-8 px-3 text-sm': size === 'sm',
			'h-10 px-4 text-base': size === 'md',
			'h-12 px-6 text-lg': size === 'lg'
		}
	);
</script>

<button 
	class={classes} 
	{disabled}
	on:click
	{...$$restProps}
>
	{#if loading}
		<svg class="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
	{/if}
	<slot />
</button>