---
title: Troubleshoot installation issues
short: Troubleshooting
tier: opensource
type: guide
order: 81
order_enterprise: 0
meta_title: Troubleshoot Label Studio installation issues
meta_description: Tips for troubleshooting Label Studio installation issues
section: "Install & Setup"
parent: "install"
date: 2023-12-06 10:38:02
---

You might see errors when installing Label Studio. Follow these steps to resolve them.

## Run the latest version of Label Studio

Many bugs might be fixed in patch releases or maintenance releases. Make sure you're running the latest version of Label Studio by [upgrading](install#Upgrade-Label-Studio) your installation before you start Label Studio.

## Errors about missing packages

If you see errors about missing packages, install those packages and try to install Label Studio again. Make sure that you run Label Studio in a clean Python environment, such as a virtual environment.

For Windows users the default installation might fail to build the `lxml` package. Consider manually installing it from [the unofficial Windows binaries](https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml). If you are running Windows 64-bit with Python 3.8 or later, run `pip install lxml‑4.5.0‑cp38‑cp38‑win_amd64.whl` to install it.

## Errors from Label Studio

If you see any other errors during installation, try to rerun the installation.

```bash
pip install --ignore-installed label-studio
```

## OpenBLAS blas_thread_init: pthread_create failed for thread X of Y: Operation not permitted

Upgrade Docker Engine to the latest available version(>= [20.10.12](https://docs.docker.com/engine/release-notes/#201012)).

## PermissionError: [Errno 13] Permission denied: `/label-studio/data/media`

!!! warning
    Starting with Label Studio 1.7.0 release, the application run using a non-root docker user with ID `1001`.

You may already be aware that Docker containers generally operate with root privileges by default. This unrestricted container management permits actions like installing system packages, modifying configuration files, and binding privileged ports, which are all beneficial for development purposes. However, this can lead to significant risks when containers are deployed in a production environment.

This is because anyone who gains access to your root-running container could initiate undesirable processes, such as injecting malicious code. Running a process in your container as root also enables altering the user id (UID) or group id (GID) when launching the container, making your application more vulnerable.

It is advised to use non-root containers for the following reasons:

- Security: Non-root containers inherently offer better security. In the event of a container engine security issue, running the container as a non-privileged user will prevent malicious code from obtaining elevated permissions on the container host. For more information on Docker's security features, refer to this guide.

- Platform limitations: Some Kubernetes distributions such as [OpenShift](https://www.openshift.com/), execute containers with random UUIDs. This method is incompatible with root containers, which must always run using the root user's UUID. In these situations, only non-root container images will operate, making them a necessity.

Our [Dockerfile](https://github.com/heartexlabs/label-studio/blob/develop/Dockerfile) contains the line `USER 1001` which assigns a non-root user UID to the image, enabling the container to run as an unprivileged user. This implementation applies the security enhancements and other restrictions mentioned above to the container.

### File permissions for non-root user

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