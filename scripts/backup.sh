#!/bin/bash
# ==============================================================================
# Script de sauvegarde automatisée eGED-ABMed (Base de données + Fichiers)
# ==============================================================================

# Charger les variables d'environnement
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Configuration par défaut
BACKUP_DIR_CONF=${BACKUP_DIR:-./backups}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR_CONF/$TIMESTAMP"

mkdir -p "$BACKUP_PATH"

echo "======================================================================"
echo "Début de la sauvegarde eGED-ABMed : $(date)"
echo "======================================================================"

# 1. Sauvegarde de la base de données PostgreSQL
echo "--> 1. Extraction du dump SQL de la base de données..."
docker exec eged-db pg_dump -U ${DB_USER:-eged_admin} ${DB_NAME:-eged_db} > "$BACKUP_PATH/db_backup.sql"
echo "Dump SQL terminé : db_backup.sql"

# 2. Sauvegarde des fichiers physiques (Uploads)
echo "--> 2. Archivage des documents téléversés (GED)..."
if [ -d "data/uploads" ]; then
  tar -czf "$BACKUP_PATH/uploads_backup.tar.gz" -C data uploads/
  echo "Fichiers GED archivés."
else
  # Sauvegarde depuis le volume docker si répertoire local non utilisé
  docker run --rm -v sgie_uploads:/volume -v "$PWD/$BACKUP_PATH:/backup" alpine tar -czf /backup/uploads_backup.tar.gz -C /volume .
  echo "Volume docker GED archivé."
fi

# 3. Compression globale de la sauvegarde
echo "--> 3. Compression de l'archive de sauvegarde..."
tar -czf "$BACKUP_DIR_CONF/eged_backup_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR_CONF" "$TIMESTAMP"
rm -rf "$BACKUP_PATH"

echo "Sauvegarde globale créée : $BACKUP_DIR_CONF/eged_backup_$TIMESTAMP.tar.gz"

# 4. Rotation et purge des anciennes sauvegardes
echo "--> 4. Nettoyage des sauvegardes datant de plus de $RETENTION_DAYS jours..."
find "$BACKUP_DIR_CONF" -name "eged_backup_*.tar.gz" -mtime +$RETENTION_DAYS -exec rm {} \; -echo "Sauvegarde obsolète supprimée."

echo "======================================================================"
echo "Sauvegarde terminée avec succès à $(date)"
echo "======================================================================"
