IMPORTED_TASKS=50000 \
LOCUST_USERS=3 \
LOCUST_HOST=http://localhost:8000 \
LOCUST_LOCUSTFILE=one_imports_other_annotate.py \
LOCUST_SPAWN_RATE=1 \
locust --headless -t 1m --csv results.csv