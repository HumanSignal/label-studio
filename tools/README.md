# Docker Label Studio Set-up

## Run set-up script

This will generate `docker-compose.yml` and `nginx.conf` that can be used for multiple Label Studio deployments on a Docker network.
For simpliciy, each server is hard-coded into the Docker compose and Nginx config files. The script is just a helper to avoid making these changes by hand if scaling up or down the number of Label Studio servers.

To run:

```bash
sh setup.sh
```

**NOTE:** Expected to run this from within `tools` folder.

The script will prompt you for:

* The number of LS servers to create. 
* The top-level domain that should be used for the Nginx config.

When it runs, it will generate: `docker-compose.yml` and `config/nginx.conf`. **NOTE:** These files will be overwritten if they exist already!

## Docker Compose configuration:

The Docker Compose file will:

* Create an NginX instance, listening on ports 80 / 443 and using the configuration file under `config/nginx.conf`.
* For the number of servers you specified in `setup.sh`, there will be a Docker service created called `labelsN` where N is the index of the server.
* These services will use the off-the-shelf `heartexlabs/label-studio:0.8.0` Docker image.
* Each instance will mount its own project folder under `./projects/labelsN`. This is where data will be persisted to.
* Each instance exposes port 8080 to _the Docker network_. (It won't be available to the host machine, see the Nginx proxy below)

## Nginx configuration:

* Nginx will function as a simple proxy. The `setup.sh` will create a `server` block, with a subdomain for each Label Studio service instance and using the TLD passed in, e.g. `labels1.native.local`, `labels2.native.local`.
* Based on which hostname is matched, Nginx will reverse proxy to the correct upstream service, running on port 8080. Because Nginx is running within the same Docker network, it can access the Label Studio instances by name e.g. `http://labels1:8080`.

## Running

* To run the Docker compose set, simply do `docker-compose up`
* You can run in a detached state with `docker-compose up -d`
* To add configuration for a new box (e.g. to add `labels4.native.local`), you can re-run `sh setup.sh` and then run `docker-compose down; sudo docker-compose up -d [--force-recreate --remove-orphans]`

