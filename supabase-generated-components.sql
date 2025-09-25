-- Table pour les composants générés dynamiquement
CREATE TABLE IF NOT EXISTS generated_components (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  code TEXT NOT NULL,
  options JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_generated_components_type ON generated_components(type);
CREATE INDEX IF NOT EXISTS idx_generated_components_created_at ON generated_components(created_at);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_generated_components_updated_at ON generated_components;
CREATE TRIGGER update_generated_components_updated_at
    BEFORE UPDATE ON generated_components
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Vues pour des requêtes fréquentes
CREATE OR REPLACE VIEW recent_components AS
SELECT 
    id,
    description,
    type,
    LEFT(code, 100) as code_preview,
    created_at
FROM generated_components
ORDER BY created_at DESC
LIMIT 50;

-- Permissions (ajustez selon vos besoins)
-- ALTER TABLE generated_components ENABLE ROW LEVEL SECURITY;

-- Insérer quelques exemples de composants pour tester
INSERT INTO generated_components (description, type, code, options) VALUES
(
    'Bouton bleu moderne avec icône',
    'button',
    '<script>
  export let variant = "primary";
  export let size = "md";
</script>

<button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
  <i class="fas fa-star mr-2"></i>
  <slot>Button</slot>
</button>',
    '{"style": "modern", "color": "blue", "icon": true}'
),
(
    'Carte produit avec image et prix',
    'card',
    '<script>
  export let title = "";
  export let price = "";
  export let image = "";
</script>

<div class="bg-white rounded-lg shadow-md overflow-hidden">
  {#if image}
    <img src={image} alt={title} class="w-full h-48 object-cover">
  {/if}
  <div class="p-4">
    <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
    {#if price}
      <p class="text-2xl font-bold text-green-600 mt-2">{price}</p>
    {/if}
    <slot></slot>
  </div>
</div>',
    '{"style": "modern", "has_image": true, "has_price": true}'
),
(
    'Input de formulaire avec validation',
    'input',
    '<script>
  export let label = "";
  export let value = "";
  export let error = "";
  export let required = false;
  export let type = "text";
</script>

<div class="w-full">
  {#if label}
    <label class="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {#if required}<span class="text-red-500">*</span>{/if}
    </label>
  {/if}
  <input
    {type}
    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {error ? ''border-red-500'' : ''''}"
    bind:value
    {required}
    on:input
    on:change
    {...$$restProps}
  />
  {#if error}
    <p class="mt-1 text-sm text-red-600">{error}</p>
  {/if}
</div>',
    '{"validation": true, "responsive": true}'
);