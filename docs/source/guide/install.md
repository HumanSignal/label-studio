---
title: Install and upgrade 
type: guide
tier: opensource
order: 103
meta_title: Install and Upgrade Label Studio 
meta_description: "Label Studio documentation: install and upgrade Label Studio with Docker, pip, and anaconda for your machine learning and data science projects." 
section: "Install"
---

Install Label Studio on premises or in the cloud. Choose the installation method that works best for your environment:
- [Install with pip](#Install-with-pip)
- [Install with Docker](#Install-with-Docker)
- [Install on Ubuntu](#Install-on-Ubuntu)
- [Install from source](#Install-from-source)
- [Install with Anaconda](#Install-with-Anaconda)
- [Upgrade Label Studio](#Upgrade-Label-Studio)

<!-- md deploy.md -->

### Web browser support
Label Studio is tested with the latest version of Google Chrome and is expected to work in the latest versions of:
- Google Chrome
- Apple Safari
- Mozilla Firefox

If using other web browsers, or older versions of supported web browsers, unexpected behavior could occur. 

## Install prerequisite

Install Label Studio in a clean Python environment. We highly recommend using a virtual environment (venv or conda) to reduce the likelihood of package conflicts or missing packages.


## Install using pip

To install Label Studio with pip and a virtual environment, you need Python version 3.7 or later. Run the following:
```bash
python3 -m venv env
source env/bin/activate
python -m pip install label-studio
```

To install Label Studio with pip, you need Python version 3.7 or later. Run the following:
```bash
pip install label-studio
```

After you install Label Studio, start the server with the following command: 
```bash
label-studio
```
The default web browser will automatically open at [http://localhost:8080](http://localhost:8080) with Label Studio. Please refer to [start Label Studio](start.html) for more options when starting Label Studio.


## Install using Homebrew

To install Label Studio with Brew, you need to have Brew package manager installed on your system. If you do not have Brew installed, please visit [brew.sh](https://brew.sh/) for installation instructions.

Execute the following command to add the Heartexlabs tap:

```bash
brew tap heartexlabs/tap
````

Execute the following command to install Label Studio:

```bash
brew install heartexlabs/tap/label-studio

```
After you install Label Studio, initiate the server using the following command:

```bash
label-studio
```

The default web browser will automatically open at [http://localhost:8080](http://localhost:8080) with Label Studio. Please refer to [start Label Studio](start.html) for more options when starting Label Studio.


## Install with Docker

Label Studio is also available as a Docker container. Make sure you have [Docker](https://www.docker.com/) installed on your machine.

### Install with Docker on *nix
To install and start Label Studio at [http://localhost:8080](http://localhost:8080), storing all labeling data in `./mydata` directory, run the following:
```bash
docker run -it -p 8080:8080 -v $(pwd)/mydata:/label-studio/data heartexlabs/label-studio:latest
```

!!! attention "important"
    As this is a non-root container, the mounted files and directories must have the proper permissions for the `UID 1001`.

### Install with Docker on Windows
Or for Windows, you have to modify the volumes paths set by `-v` option.

#### Override the default Docker install
You can override the default Docker install by appending new arguments.

In Windows Command Line (cmd):
```bash
docker run -it -p 8080:8080 -v %cd%/mydata:/label-studio/data heartexlabs/label-studio:latest label-studio --log-level DEBUG
```

In PowerShell:
```bash
docker run -it -p 8080:8080 -v ${PWD}/mydata:/label-studio/data heartexlabs/label-studio:latest label-studio --log-level DEBUG
```

### Build a local image with Docker
If you want to build a local image, run:
```bash
docker build -t heartexlabs/label-studio:latest .
```

### Run with Docker Compose
Use Docker Compose to serve Label Studio at `http://localhost:8080`. You must use Docker Compose version 1.25.0 or higher.

Start Label Studio:
```bash
docker-compose up -d
```

This starts Label Studio with a PostgreSQL database backend. You can also use a PostgreSQL database without Docker Compose. See [Set up database storage](storedata.html).

### Install Label Studio without internet access
Download label-studio docker image (host with internet access and docker):
```bash 
docker pull heartexlabs/label-studio:latest
```

Export it as a tar archive: 
```bash
docker save heartexlabs/label-studio:latest | gzip > label_studio_latest.tar.gz
```

Transfer it to another VM:
```bash
scp label_studio_latest.tar.gz <ANOTHER_HOST>:/tmp
```

SSH into `<ANOTHER_HOST>` and import the archive:
```bash
docker image import /tmp/label_studio_latest.tar.gz
```

Follow steps from [Install and Upgrade to run LS](install.html#Install-with-Docker).

## Install on Ubuntu

To install Label Studio on Ubuntu and run it in a virtual environment, run the following command:

```bash
python3 -m venv env
source env/bin/activate
sudo apt install python3.9-dev
python -m pip install label-studio
```

## Install from source

If you want to use nightly builds or extend the functionality, consider downloading the source code using Git and running Label Studio locally:

```bash
git clone https://github.com/heartexlabs/label-studio.git
cd label-studio
# Install all package dependencies
pip install -e .
# Run database migrations
python label_studio/manage.py migrate
# Collect static files
python label_studio/manage.py collectstatic
# Start the server in development mode at http://localhost:8080
python label_studio/manage.py runserver
```

## Install with Anaconda

```bash
conda create --name label-studio
conda activate label-studio
pip install label-studio
```

## Upgrade Label Studio
To upgrade to the latest version of Label Studio, reinstall or upgrade using pip.

```bash
pip install --upgrade label-studio
```

Migration scripts run when you upgrade to version 1.0.0 from version 0.9.1 or earlier.

To make sure an existing project gets migrated, when you [start Label Studio](start.html), run the following command:

```bash
label-studio start path/to/old/project 
```

The most important change to be aware of is changes to rename "completions" to "annotations". See the [updated JSON format for completed tasks](export.html#Raw_JSON_format_of_completed_tasks).

If you customized the Label Studio Frontend, see the [Frontend reference guide](frontend_reference.html) for required updates to maintain compatibility with version 1.0.0.

## Troubleshoot installation

You might see errors when installing Label Studio. Follow these steps to resolve them.

### Run the latest version of Label Studio
Many bugs might be fixed in patch releases or maintenance releases. Make sure you're running the latest version of Label Studio by upgrading your installation before you start Label Studio. 

### Errors about missing packages

If you see errors about missing packages, install those packages and try to install Label Studio again. Make sure that you run Label Studio in a clean Python environment, such as a virtual environment.

For Windows users the default installation might fail to build the `lxml` package. Consider manually installing it from [the unofficial Windows binaries](https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml). If you are running Windows 64-bit with Python 3.8 or later, run `pip install lxml‑4.5.0‑cp38‑cp38‑win_amd64.whl` to install it. 

### Errors from Label Studio 
If you see any other errors during installation, try to rerun the installation.

```bash
pip install --ignore-installed label-studio
```

### OpenBLAS blas_thread_init: pthread_create failed for thread X of Y: Operation not permitted
Upgrade Docker Engine to the latest available version(>= [20.10.12](https://docs.docker.com/engine/release-notes/#201012)).

### PermissionError: [Errno 13] Permission denied: `/label-studio/data/media`

!!! warning
    Starting with Label Studio 1.7.0 release, the application run using a non-root docker user with ID `1001`.

You may already be aware that Docker containers generally operate with root privileges by default. This unrestricted container management permits actions like installing system packages, modifying configuration files, and binding privileged ports, which are all beneficial for development purposes. However, this can lead to significant risks when containers are deployed in a production environment.

This is because anyone who gains access to your root-running container could initiate undesirable processes, such as injecting malicious code. Running a process in your container as root also enables altering the user id (UID) or group id (GID) when launching the container, making your application more vulnerable.

It is advised to use non-root containers for the following reasons:

- Security: Non-root containers inherently offer better security. In the event of a container engine security issue, running the container as a non-privileged user will prevent malicious code from obtaining elevated permissions on the container host. For more information on Docker's security features, refer to this guide.

- Platform limitations: Some Kubernetes distributions such as [OpenShift](https://www.openshift.com/), execute containers with random UUIDs. This method is incompatible with root containers, which must always run using the root user's UUID. In these situations, only non-root container images will operate, making them a necessity.

Our [Dockerfile](https://github.com/heartexlabs/label-studio/blob/develop/Dockerfile) contains the line `USER 1001` which assigns a non-root user UID to the image, enabling the container to run as an unprivileged user. This implementation applies the security enhancements and other restrictions mentioned above to the container.

#### File permissions for non-root user
By default, Label Studio container images operate as non-root. As a result, any directory requiring write access must be assigned to the root group (`GID 0`). This ensures that the arbitrary user (default `UID 1001`) can write to the directory, as this user is always part of the root group. To achieve this, simply set the ownership of the local directory to the root group (GID 0), which will be enough regardless of the UID:
```bash
mkdir mydata
sudo chown :0 mydata
```

!!! note
    If you want to learn more about non-root containers and Docker and Kubernetes security, check out the following articles:
    
    [Docker Security documentation](https://docs.docker.com/engine/security/security/)

    [Understanding how uid and gid work in Docker containers by Marc Campbell](https://medium.com/@mccode/understanding-how-uid-and-gid-work-in-docker-containers-c37a01d01cf)

    [Processes In Containers Should Not Run As Root](https://medium.com/@mccode/processes-in-containers-should-not-run-as-root-2feae3f0df3b)

    [Just say no to root (containers) by Daniel J. Walsh](https://opensource.com/article/18/3/just-say-no-root-containers)

    [Running a Docker container as a non-root user by Lucas Willson-Richter](https://medium.com/redbubble/running-a-docker-container-as-a-non-root-user-7d2e00f8ee15)

    [How to run a more secure non-root user container by Dan Wash](https://www.projectatomic.io/blog/2016/01/how-to-run-a-more-secure-non-root-user-container/)
