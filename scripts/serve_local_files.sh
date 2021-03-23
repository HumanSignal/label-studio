INPUT_DIR=$1
WILDCARD=${2}
OUTPUT_FILE=${3:-"files.txt"}
PORT=${3:-8000}

FIND_CMD="find ${INPUT_DIR} -type f"
if [ -z "$WILDCARD" ]; then
  echo "Files wildcard is not set. Serve all files in ${INPUT_DIR}..."
else
  FIND_CMD="${FIND_CMD} -name ${WILDCARD}"
fi

eval $FIND_CMD | sed "s/\.\//http:\/\/localhost:${PORT}\//g" > $OUTPUT_FILE

echo "File list stored in ${OUTPUT_FILE}..."

python -m http.server $PORT -d $INPUT_DIR
