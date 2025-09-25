<script>
	import { clsx } from 'clsx';

	export let value = '';
	export let type = 'text';
	export let placeholder = '';
	export let label = '';
	export let error = '';
	export let disabled = false;
	export let required = false;

	$: inputClasses = clsx(
		'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
		{
			'border-red-300 focus:border-red-500 focus:ring-red-500': error,
			'bg-gray-50 cursor-not-allowed': disabled
		}
	);
</script>

<div class="space-y-1">
	{#if label}
		<label class="block text-sm font-medium text-gray-700">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}

	<input
		bind:value
		{type}
		{placeholder}
		{disabled}
		{required}
		class={inputClasses}
		{...$$restProps}
		on:input
		on:focus
		on:blur
		on:keydown
	/>

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
</div>