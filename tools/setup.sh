FILE=../docker-compose.yml
echo "*********************"
echo "RECREATE DOCKER CONFIG"
echo "*********************"
echo ''
echo "Recreating Docker config..."
echo ''
echo "This will overwrite:"
echo "\t../docker-compose.yml"
echo "\t../config/nginx.conf"
echo ''
echo "Do you wish to continue? [y/N]"
read continue
if [ "$continue" = "y" ]; then
    echo "How many servers should config be created for? [1]"
    read NUMBER_OF_SERVERS
else
    echo "Didn't recognise option as 'y', so exiting."
    exit 0;
fi
echo "What base URL do you want the domains to use? [native.io]"
read BASE_URL

NUMBER_OF_SERVERS="${NUMBER_OF_SERVERS:-1}"
BASE_URL="${BASE_URL:-native.io}"

echo "Creating Docker Compose file (writing to '$FILE') for $NUMBER_OF_SERVERS Label Studio instances"
echo 'version: "3"' > $FILE 
echo '' >> $FILE
echo 'services:' >> $FILE 
echo '  nginx:' >> $FILE
echo '    image: nginx:latest' >> $FILE
echo '    container_name: nginx_proxy' >> $FILE
echo '    volumes:' >> $FILE
echo '      - ./config/nginx.conf:/etc/nginx/nginx.conf' >> $FILE
echo '    ports:' >> $FILE
echo '      - 80:80' >> $FILE
echo '      - 443:443' >> $FILE
echo '    restart: always' >> $FILE
for i in $(seq "$NUMBER_OF_SERVERS"); do
    if [ ! -d "../projects/labels$i" ]; then
      echo "\e[33m../projects/labels$i missing. Running instance $i with '--init' flag\e[39m"
      AT_LEAST_ONE_RECREATED=TRUE
      INIT_COMMAND='--init'
    else
      echo "\e[32m../projects/labels$i present, skipping '--init' flag\e[39m"
      INIT_COMMAND=''
    fi
    echo "  labels$i:" >> $FILE
    echo '    build: .' >> $FILE
    echo "    container_name: labels$i" >> $FILE
    echo "    command: 'label-studio start my_project $INIT_COMMAND --host 0.0.0.0'" >> $FILE
    echo '    volumes:' >> $FILE
    echo "      - ./projects/labels$i:/label-studio/my_project" >> $FILE
    echo '    expose:' >> $FILE
    echo '      - "8080"' >> $FILE
    echo '    restart: always' >> $FILE
done
echo '' >> $FILE
echo "Created $FILE"
mkdir -p ../config
FILE=../config/nginx.conf
echo "Creating NginX Config file (writing to '$FILE') for $NUMBER_OF_SERVERS Label Studio instances on domain $BASE_URL"
echo 'events {}' > $FILE
echo '' >> $FILE
echo 'http {' >> $FILE
echo '  client_max_body_size 20m;' >> $FILE
echo '  server {' >> $FILE
echo '    listen 80 default_server;' >> $FILE
echo '    server_name _;' >> $FILE
echo '    return 404;' >> $FILE
echo '  }' >> $FILE
echo '' >> $FILE
for i in $(seq "$NUMBER_OF_SERVERS"); do
echo '  server {' >> $FILE
echo "    server_name labels$i.$BASE_URL;" >> $FILE
echo '    sub_filter http https;' >> $FILE
echo "    sub_filter 'localhost:8080' 'labels$i.$BASE_URL';" >> $FILE
echo '    sub_filter_once off;' >> $FILE
echo '    location / {' >> $FILE
echo "      proxy_pass 'http://labels$i:8080';" >> $FILE
echo '      rewrite ^/(.*)$ /$1 break;' >> $FILE
echo '    }' >> $FILE
echo '' >> $FILE
echo '    listen 80;' >> $FILE
echo '  }' >> $FILE
done
echo '}' >> $FILE
echo '' >> $FILE
echo "Created $FILE"

echo ''
echo "Now you can run 'sudo docker-compose up -d --force-recreate --remove-orphans'. If running locally, don't forget to add entries to your host file:"
echo -n '127.0.0.1'
for i in $(seq "$NUMBER_OF_SERVERS"); do
echo -n "\tlabels$i.$BASE_URL"
done
echo ''
if [ -n "$AT_LEAST_ONE_RECREATED" ]; then
echo ''
echo "\e[33m*********************"
echo "WARNING"
echo "*********************\e[39m"
echo ''
echo "You've created one or more new instances, so docker-compose.yml has been set to run those instances with the '--init' flag. (Label Studio requirement). This flag should be _removed_ from the script before the next time this instance runs."
echo ''
echo 'You should now:'
echo "\tRun 'docker-compose up' and let Label Studio do initial creation".
echo "\tEdit the docker-compose.yml to remove the --init flag (manually, or rerun setup.sh)"
echo "\tRestart docker-compose with new YML file."
echo "This will prevent 'init' running each time on your new instances"

fi

