import Button from '../Button.svelte';

export default {
  title: 'Base/Button',
  component: Button,
  args: { label: 'Clique-moi', variant: 'primary' }
};

export const Primaire = {
  args: { variant: 'primary' }
};

export const Secondaire = {
  args: { variant: 'secondary', label: 'Option' }
};

export const Désactivé = {
  args: { disabled: true }
};
