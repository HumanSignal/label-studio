---
title: Upgrade Label Studio
type: guide
tier: opensource
order: 96
order_enterprise: 0
meta_title: Upgrade Label Studio Community Edition
meta_description: Documentation for upgrade paths and commands for Label Studio. 
section: "Install & Setup"
---

When upgrading Label Studio, keep the following in mind:

- **Backup Your Data**: Before starting the upgrade, make sure to back up your existing projects, databases, and any custom configurations. 
- **Review Release Notes**: Check [the release notes](https://github.com/HumanSignal/label-studio/releases) for the version you're upgrading to. Pay attention to any breaking changes or migration steps that may be required. 
- **Python Compatibility**: Ensure that your Python version is compatible with the new Label Studio release. Label Studio supports Python 3.10 through 3.13.  Using an incompatible Python version can lead to installation errors.
- **Check for Dependency Issues**: After upgrading, verify that all dependencies are correctly installed. If you encounter missing package errors, you might need to install those packages manually. Running Label Studio in a clean Python environment or virtual environment can reduce the likelihood of package conflicts.
- **Test Your Setup**: After upgrading, test your Label Studio instance to ensure everything works as expected. Check key functionalities like task loading, labeling interfaces, data export, and any integrations you use.
- **Troubleshoot Installation Issues**: If you encounter any issues during the upgrade, see [Troubleshoot installation issues](install_troubleshoot). 



## Upgrade using pip
  
```bash
 pip install --upgrade label-studio
```


## Upgrade using Docker

1. Stop the existing Label Studio container:
    ```bash
    docker ps  # Find the container ID or name
    docker stop <container_id_or_name>
    ```
2. Pull the latest Label Studio Docker image:
    ```bash
    docker pull heartexlabs/label-studio:latest
    ```
3. Start a new container with the latest image, using the same volume mappings as before:
    ```bash
    docker run -it -p 8080:8080 \
    -v /path/to/yourdata:/label-studio/data \
    -v /path/to/yourfiles:/label-studio/files \
    heartexlabs/label-studio:latest
    ```
    Replace `/path/to/yourdata` and /`path/to/yourfiles` with the actual paths you used previously.
4. Run database migrations (if necessary). 

    If you encounter any issues after upgrading, you might need to run database migrations:

    ```bash
    docker exec -it <container_id_or_name> bash
    cd /label-studio
    python manage.py migrate
    ```
5. Open Label Studio in your browser at `http://localhost:8080` and check that your projects and data are accessible.


## Upgrade after installing from source

If you installed Label Studio [using the source in Github](https://github.com/HumanSignal/label-studio), you can upgrade using the following steps. 

<div class="code-tabs">
  <div data-name="Using Poetry (recommended)">

  If you're using Poetry ([see these instructions](install#Install-from-source)), upgrade with the following steps:
  
  1. Navigate to your Label Studio directory (where you cloned the repository). 
  2. Fetch the latest changes from the repository:
  ```bash
    git pull
  ```
  3. If you want to upgrade to a specific version, list available tags and checkout the desired one. For example, to upgrade to version 1.14.0:
  ```bash
    git fetch --tags
    git checkout v1.14.0
  ```
  4. Install updated dependencies using Poetry:
  ```bash
    poetry install
  ```
  5. Run database migrations to apply any updates to the database schema:
  ```bash
    poetry run python label_studio/manage.py migrate
  ```
  6. Collect static files:
  ```bash
    poetry run python label_studio/manage.py collectstatic
  ```
  7. Restart Label Studio:
  ```bash
    poetry run python label_studio/manage.py runserver
  ```

  </div>
  <div data-name="Using pip">
  
  1. Navigate to your Label Studio directory (where you cloned the repository). 
  2. Fetch the latest changes from the repository:
  ```bash
    git pull
  ```
  1. If you want to upgrade to a specific version, list available tags and checkout the desired one. For example, to upgrade to version 1.14.0:
  ```bash
    git fetch --tags
    git checkout v1.14.0
  ```
  1. Install updated dependencies:
  ```bash
    pip install -r requirements.txt
  ```
  1. Run database migrations to apply any updates to the database schema:
  ```bash
    python label_studio/manage.py migrate
  ```
  1. Collect static files:
  ```bash
    python label_studio/manage.py collectstatic
  ```
  1. Restart Label Studio:
  ```bash
    python label_studio/manage.py runserver
  ```

  </div>
</div>

## Upgrade a Kubernetes installation

See [Upgrade Label Studio using Helm](install_k8s#Upgrade-Label-Studio-using-Helm). 
