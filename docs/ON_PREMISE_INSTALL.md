# Guide d'Installation et d'Administration On-Premise — eGED-ABMed

Ce guide décrit la procédure d'installation, de configuration et d'administration de la plateforme **eGED-ABMed** sur l'infrastructure informatique interne (On-Premise) de l'ABMed.

---

## 1. Architecture Générale

La plateforme eGED-ABMed est conteneurisée à l'aide de Docker. Elle comprend :
1.  **Serveur Applicatif (eGED-App)** : Une application Next.js s'exécutant dans un conteneur Node.js en mode standalone.
2.  **Base de Données (eGED-Db)** : Un serveur PostgreSQL 16 standard pour la persistance des données.
3.  **Stockage Persistant (Volume GED)** : Un volume local persistant monté dans le conteneur applicatif pour stocker les pièces jointes (certificats, rapports de destruction, photos).

---

## 2. Prérequis Serveur

### Matériel Recommandé
*   **Processeur (CPU)** : 4 Cœurs
*   **Mémoire (RAM)** : 8 Go minimum
*   **Disque Dur** : 50 Go (SSD recommandé, extensible selon le volume des documents GED téléversés)

### Logiciel Recommandé
*   **Système d'Exploitation** : Ubuntu Server 22.04 LTS ou Linux Debian 12 (Recommandé). Compatible également avec Windows Server (avec Docker Desktop).
*   **Outils requis** :
    *   Docker Engine (v24.0.0+)
    *   Docker Compose (v2.20.0+)
    *   Git (pour cloner les mises à jour)

---

## 3. Procédure d'Installation (Docker)

1.  **Cloner le code source du projet** sur le serveur de l'ABMed :
    ```bash
    git clone https://github.com/ITAINNOVATE/sgieabmed.git /opt/eged-abmed
    cd /opt/eged-abmed
    ```

2.  **Configurer les variables d'environnement** :
    Copiez le fichier d'exemple et modifiez-le pour y inscrire vos clés et mots de passe de production :
    ```bash
    cp .env.example .env
    nano .env
    ```
    *Assurez-vous de modifier la valeur de `DB_PASSWORD` et `NEXTAUTH_SECRET` pour garantir la sécurité de l'application.*

3.  **Rendre les scripts exécutables** :
    ```bash
    chmod +x scripts/*.sh
    ```

4.  **Lancer l'installation automatisée** :
    ```bash
    ./scripts/install.sh
    ```
    *Ce script vérifie les prérequis, crée les répertoires et lance les conteneurs Docker en arrière-plan.*

5.  **Vérifier le statut du déploiement** :
    ```bash
    docker compose ps
    ```
    L'application doit écouter sur le port configuré (par défaut le port `80`).

---

## 4. Configuration des Variables d'Environnement (.env)

| Variable | Description | Exemple |
|---|---|---|
| `APP_PORT_HOST` | Port d'exposition de l'application sur le serveur | `80` |
| `APP_URL` | URL racine publique de la plateforme | `https://eged.abmed.gov` |
| `NEXTAUTH_SECRET` | Clé secrète de chiffrement des sessions | `Clé_Aléatoire_Forte_De_Production` |
| `DB_NAME` | Nom de la base de données PostgreSQL | `eged_db` |
| `DB_USER` | Utilisateur administrateur PostgreSQL | `eged_admin` |
| `DB_PASSWORD` | Mot de passe de l'administrateur DB | `Mot_de_passe_robuste_2026` |
| `DATABASE_URL` | Chaîne de connexion complète | `postgres://eged_admin:pass@eged-db:5432/eged_db` |
| `STORAGE_DRIVER` | Mode de stockage des fichiers | `local` |
| `STORAGE_LOCAL_PATH` | Répertoire interne de stockage des fichiers | `/app/uploads` |

---

## 5. Procédure de Sauvegarde (Backup)

Le script de sauvegarde exporte un dump SQL de la base de données PostgreSQL et archive tous les documents GED importés.

### Sauvegarde Manuelle
Exécutez le script :
```bash
./scripts/backup.sh
```
L'archive de sauvegarde compressée sera générée dans le dossier `./backups/` sous la forme :
`eged_backup_YYYYMMDD_HHMMSS.tar.gz`.

### Automatisation de la Sauvegarde (Cron Job)
Pour automatiser la sauvegarde chaque jour à minuit, ajoutez une tâche cron :
```bash
crontab -e
```
Ajoutez la ligne suivante :
```bash
0 0 * * * /bin/bash /opt/eged-abmed/scripts/backup.sh >> /var/log/eged_backup.log 2>&1
```

---

## 6. Procédure de Restauration (Restore)

En cas de panne ou de migration vers un nouveau serveur :

1.  Placez l'archive de sauvegarde `.tar.gz` sur le serveur.
2.  Exécutez le script de restauration en passant le chemin de l'archive en paramètre :
    ```bash
    ./scripts/restore.sh ./backups/eged_backup_20260713_020000.tar.gz
    ```
3.  Le script va automatiquement :
    *   Vider la base de données actuelle de production.
    *   Réimporter le dump SQL de la sauvegarde.
    *   Restaurer tous les documents GED physiques dans le répertoire de stockage.

---

## 7. Mises à Jour de la Plateforme

Pour déployer une nouvelle version depuis le dépôt de l'ABMed :

1.  Récupérer la mise à jour :
    ```bash
    git pull origin main
    ```
2.  Recompiler et redémarrer les conteneurs :
    ```bash
    docker compose up -d --build
    ```
    *Le volume de la base de données et des fichiers GED reste persistant et n'est pas altéré lors des mises à jour.*
