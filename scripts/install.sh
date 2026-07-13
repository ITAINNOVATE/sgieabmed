#!/bin/bash
# ==============================================================================
# Script d'installation et de démarrage On-Premise eGED-ABMed
# ==============================================================================

# Arrêter le script en cas d'erreur
set -e

echo "======================================================================"
echo "          Installation de la plateforme eGED-ABMed (On-Premise)       "
echo "======================================================================"

# 1. Vérification des prérequis
echo "--> 1. Vérification des outils nécessaires..."
if ! [ -x "$(command -v docker)" ]; then
  echo "Erreur : Docker n'est pas installé sur ce serveur. Veuillez installer Docker d'abord." >&2
  exit 1
fi

if ! [ -x "$(command -v docker-compose)" ] && ! docker compose version >/dev/null 2>&1; then
  echo "Erreur : Docker Compose n'est pas installé sur ce serveur." >&2
  exit 1
fi
echo "Docker et Docker Compose sont installés."

# 2. Copie du fichier de configuration s'il n'existe pas
echo "--> 2. Configuration des variables d'environnement..."
if [ ! -f .env ]; then
  echo "Fichier .env absent. Création à partir de .env.example..."
  cp .env.example .env
  echo "Fichier .env créé. VEUILLEZ ÉDITER CE FICHIER POUR AJUSTER LES MOTS DE PASSE !"
else
  echo "Fichier .env déjà présent."
fi

# 3. Création des répertoires pour les données locales et sauvegardes
echo "--> 3. Initialisation des répertoires de données..."
mkdir -p data/uploads
mkdir -p backups

# 4. Build et Lancement des conteneurs
echo "--> 4. Construction et démarrage des conteneurs Docker..."
docker compose up -d --build

echo "======================================================================"
echo "Installation terminée avec succès !"
echo "L'application est en cours d'exécution."
echo "Vous pouvez y accéder via : http://localhost"
echo "======================================================================"
