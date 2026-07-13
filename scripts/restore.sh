#!/bin/bash
# ==============================================================================
# Script de restauration eGED-ABMed (Base de données + Fichiers)
# ==============================================================================

set -e

# Charger les variables d'environnement
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

BACKUP_DIR_CONF=${BACKUP_DIR:-./backups}

echo "======================================================================"
echo "          Restauration de la plateforme eGED-ABMed                    "
echo "======================================================================"

# 1. Sélection de la sauvegarde
if [ -z "$1" ]; then
  echo "Erreur : Veuillez spécifier le chemin complet du fichier de sauvegarde .tar.gz en argument."
  echo "Exemple : ./scripts/restore.sh ./backups/eged_backup_20260713_120000.tar.gz"
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Erreur : Fichier de sauvegarde introuvable : $BACKUP_FILE"
  exit 1
fi

TEMP_DIR=$(mktemp -d)
echo "--> 1. Extraction de la sauvegarde vers un répertoire temporaire..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Trouver le sous-dossier contenant les fichiers extraits
SUB_DIR=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d)

# 2. Restauration de la base de données
echo "--> 2. Restauration de la base de données PostgreSQL..."
if [ -f "$SUB_DIR/db_backup.sql" ]; then
  # On vide la base avant de restaurer
  echo "Nettoyage de la base de données existante..."
  docker exec -i eged-db psql -U ${DB_USER:-eged_admin} -d ${DB_NAME:-eged_db} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  
  echo "Importation du dump SQL..."
  docker exec -i eged-db psql -U ${DB_USER:-eged_admin} -d ${DB_NAME:-eged_db} < "$SUB_DIR/db_backup.sql"
  echo "Restauration de la base de données terminée."
else
  echo "Avertissement : Fichier db_backup.sql introuvable dans la sauvegarde."
fi

# 3. Restauration des fichiers physiques (Uploads)
echo "--> 3. Restauration des fichiers de la GED..."
if [ -f "$SUB_DIR/uploads_backup.tar.gz" ]; then
  mkdir -p data/uploads
  tar -xzf "$SUB_DIR/uploads_backup.tar.gz" -C data/
  echo "Restauration des fichiers terminée."
else
  echo "Avertissement : Archive des fichiers GED introuvable dans la sauvegarde."
fi

# Nettoyage
rm -rf "$TEMP_DIR"

echo "======================================================================"
echo "Restauration terminée avec succès !"
echo "======================================================================"
