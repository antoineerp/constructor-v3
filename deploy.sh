#!/bin/bash
# 🚀 Script de déploiement rapide vers Vercel
# Usage: ./deploy.sh "Mon message de commit"

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Constructor V3 - Déploiement Rapide${NC}\n"

# Vérifier si un message de commit est fourni
if [ -z "$1" ]; then
  echo -e "${YELLOW}Usage: ./deploy.sh \"Votre message de commit\"${NC}"
  exit 1
fi

COMMIT_MESSAGE="$1"

# Étape 1: Git add
echo -e "${BLUE}📦 Ajout des fichiers modifiés...${NC}"
git add -A

# Afficher le statut
echo -e "\n${BLUE}📋 Fichiers modifiés:${NC}"
git status --short

# Étape 2: Git commit
echo -e "\n${BLUE}💾 Commit en cours...${NC}"
git commit -m "$COMMIT_MESSAGE"

# Étape 3: Git push
echo -e "\n${BLUE}☁️  Push vers GitHub...${NC}"
git push origin main

echo -e "\n${GREEN}✅ Déploiement réussi!${NC}"
echo -e "${BLUE}📊 Le build Vercel devrait démarrer dans ~30 secondes${NC}"
echo -e "${BLUE}🔗 Dashboard: https://vercel.com/dashboard${NC}\n"
