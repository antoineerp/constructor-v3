<script>
	import { clsx } from 'clsx';

	export let title = '';
	export let description = '';
	export let padding = 'md';
	export let shadow = true;

	$: classes = clsx(
		'bg-white rounded-lg border border-gray-200',
		{
			'p-3': padding === 'sm',
			'p-6': padding === 'md',
			'p-8': padding === 'lg',
			'shadow-md': shadow
		}
	);
</script>

<div class={classes}>
	{#if title}
		<h3 class="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
	{/if}
	
	{#if description}
		<p class="text-gray-600 mb-4">{description}</p>
	{/if}
	
	<slot />
</div>