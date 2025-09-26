<script lang="ts">
  export let label: string = 'Bouton';
  export let variant: 'primary' | 'secondary' = 'primary';
  export let disabled: boolean = false;
</script>

<button
  class="px-4 py-2 rounded font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition text-sm
    {variant === 'primary' ? 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-500'}"
  {disabled}
>
  {label}
</button>
