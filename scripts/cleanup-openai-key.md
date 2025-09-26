## Nettoyage de la clé OpenAI exposée

Étapes à suivre après fuite détectée (push bloqué GitHub Push Protection) :

1. Révoquer / régénérer la clé dans le dashboard OpenAI.
2. Mettre à jour la variable d'environnement sur Vercel: `OPENAI_API_KEY`.
3. Vérifier que le code utilise `$env/dynamic/private` (fait dans `src/lib/openaiService.js`).
4. Supprimer les dossiers de build contenant l'ancienne valeur:
   - `apps/main/.svelte-kit`
   - `apps/main/.vercel/output`
5. Purger l'historique git (si commits passés contiennent la clé) :
```bash
pip install --user git-filter-repo  # si pas installé
git filter-repo --invert-paths --path apps/main/.svelte-kit --path apps/main/.vercel
```
6. Forcer le push :
```bash
git push --force origin main
```
7. Confirmer via `grep -R "sk-" -n .` qu'aucune clé réelle ne reste.

Ne jamais committer `.env` ni les sorties de build.
