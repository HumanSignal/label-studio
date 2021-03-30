INPUT_DIR=$1
WILDCARD=${2}
OUTPUT_FILE=${3:-"files.txt"}
PORT=${3:-8081}

FIND_CMD="find ${INPUT_DIR} -type f"
if [ -z "$WILDCARD" ]; then
  echo "Files wildcard is not set. Serve all files in ${INPUT_DIR}..."
else
  FIND_CMD="${FIND_CMD} -name ${WILDCARD}"
fi

eval $FIND_CMD | sed 's!.*/!!' | sed -e "s/^/http:\/\/localhost:${PORT}\//" > $OUTPUT_FILE

green=`tput setaf 2`
reset=`tput sgr0`
echo "${green}File list stored in '''${OUTPUT_FILE}'''. Now import it directly from Label Studio UI${reset}"

python -m http.server $PORT -d $INPUT_DIR
