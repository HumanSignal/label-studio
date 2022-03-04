This is how I've been connecting the label studio container to my Pachyderm cluster.

My docker daemon and pachyderm cluster are running on my "server" (192.168.7.137).
If you are running both of those on your local machine than you can probably omit the ip address
  or replace it with "localhost"

ssh into "server" and run:

    > kubectl port-forward --address localhost,192.168.7.137 service/pachd 30650:30650

build the dev container: 
(You need to user buildkit and you may or may not need to explicitly enable it with the environment variable)

    > DOCKER_BUILDKIT=1 docker build -t label-studio:pachctl .

run the dev container:
(Note: I'm forwarding port 5476 on my "server" to 8080 within the container)
    > docker run --rm --device=/dev/fuse --cap-add SYS_ADMIN -p 192.168.7.137:5476:8080 --name label-studio label-studio:pachctl

This usually takes a bit of time to initialize itself. Eventually `http://192.168.7.137:5476` will resolve

To connect to pachyderm cluster, run the following:
(You can put whatever address you need to as the argument)

    > docker exec -it label-studio bash ./init-pachyderm.sh 192.168.7.137:30650

Optionally, if you are running on your own machine you may be able to mount as a volume or `docker cp` your pachyderm
config into your `label-studio` container at `/root/.pachyderm/config`
