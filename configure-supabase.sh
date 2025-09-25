#!/bin/bash

# Script d'aide pour configurer Supabase
# Exécutez ce script après avoir créé votre projet Supabase

echo "🚀 Configuration Supabase pour Constructor V3"
echo "============================================="
echo ""

echo "Étapes à suivre :"
echo ""

echo "1️⃣  Allez sur https://app.supabase.com/"
echo "2️⃣  Créez un nouveau projet (ou sélectionnez-en un existant)"
echo "3️⃣  Attendez que le projet soit initialisé (2-3 minutes)"
echo "4️⃣  Allez dans Settings → API"
echo "5️⃣  Copiez votre Project URL et vos clés API"
echo ""

echo "📋 Informations nécessaires :"
echo ""
echo "• Project URL : https://xxxxxxxxxxxxx.supabase.co"
echo "• anon/public key : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "• service_role key (optionnel) : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo ""

# Demander les informations à l'utilisateur
read -p "Entrez votre Project URL (ex: https://xxxxx.supabase.co) : " SUPABASE_URL
read -p "Entrez votre anon/public key : " SUPABASE_ANON_KEY
read -p "Entrez votre service_role key (optionnel, appuyez sur Entrée pour passer) : " SUPABASE_SERVICE_ROLE_KEY

echo ""
echo "📝 Mise à jour du fichier .env..."

# Créer le fichier .env avec les bonnes valeurs
cat > .env << EOF
# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Public Supabase Configuration (pour le client-side)
PUBLIC_SUPABASE_URL=$SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# OpenAI Configuration
OPENAI_API_KEY=sk-your_openai_api_key

# Socket.io Configuration (optionnel pour la collaboration)
SOCKET_SERVER_URL=http://localhost:3001
PUBLIC_SOCKET_SERVER_URL=http://localhost:3001

# Application URLs
PUBLIC_MAIN_APP_URL=http://localhost:5173
PUBLIC_PREVIEW_APP_URL=http://localhost:5174
PUBLIC_ADMIN_APP_URL=http://localhost:5176

# Development
NODE_ENV=development
EOF

echo "✅ Fichier .env mis à jour avec succès !"
echo ""

echo "🗄️  Maintenant, initialisons la base de données :"
echo ""
echo "1️⃣  Allez dans l'éditeur SQL de Supabase (SQL Editor)"
echo "2️⃣  Créez une nouvelle requête"
echo "3️⃣  Copiez le contenu du fichier 'supabase-schema.sql' et exécutez-le"
echo "4️⃣  Créez une autre requête avec le contenu de 'supabase-data.sql' et exécutez-la"
echo ""

echo "🔧 Ou utilisez ces commandes pour ouvrir les fichiers SQL :"
echo ""
if command -v code &> /dev/null; then
    echo "code supabase-schema.sql"
    echo "code supabase-data.sql"
elif command -v nano &> /dev/null; then
    echo "nano supabase-schema.sql"
    echo "nano supabase-data.sql"
else
    echo "cat supabase-schema.sql"
    echo "cat supabase-data.sql"
fi

echo ""
echo "🚀 Une fois terminé, démarrez l'application avec :"
echo "pnpm run dev"
echo ""
echo "📱 Ensuite, testez la connexion sur :"
echo "http://localhost:5173/supabase-config"
echo ""

echo "🎉 Configuration terminée ! Bonne création avec Constructor V3 !"