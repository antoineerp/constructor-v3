# Composants externes

Ce dossier contiendra une ingestion (snapshot) de composants Svelte open-source sélectionnés pour tests IA.

Structure proposée:
- skeleton/** (extraits du projet Skeleton – vérifier licence)
- flowbite/**
- headless/** (ex. composants headless minimalistes)
- shadcn/** (adaptations Svelte de patterns shadcn)

Chaque sous-dossier aura:
- meta.json (source, licence, version, url)
- components/*.svelte

Script d\'ingestion: voir `tools/ingest-external.mjs`.
