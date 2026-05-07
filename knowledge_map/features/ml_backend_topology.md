# ML Backend Topology

Biowork runs separate ML backend containers for dev and prod/MIB. Do not
bridge one backend container across both Label Studio Docker networks.

## Network Boundary

| Environment | Biowork app container | Docker network | Backend compose suffix |
|-------------|-----------------------|----------------|------------------------|
| dev | `label-studio-app-dev` | `label-studio-dev-network` | `docker-compose.yml` |
| prod/MIB | `label-studio-app` | `label-studio-network` | `docker-compose.prod.yml` |

The backend DNS aliases are intentionally the same in both environments
because Docker aliases are scoped per network.

| Backend | Alias used by templates | Internal port |
|---------|-------------------------|---------------|
| SAM2 | `sam2-backend` | `9090` |
| FastSAM | `fastsam-backend` | `9090` |
| YOLO | `yolo-backend` | `9090` |

Host port mappings are only for local debugging and must be unique when
dev and prod backends run at the same time.

## Compose Files

In sibling repo `biowork-ml-backend`:

| Backend | Dev compose | Prod compose |
|---------|-------------|--------------|
| SAM2 | `label_studio_ml/examples/segment_anything_2_image/docker-compose.yml` | `label_studio_ml/examples/segment_anything_2_image/docker-compose.prod.yml` |
| FastSAM | `label_studio_ml/examples/FastSAM/docker-compose.yml` | `label_studio_ml/examples/FastSAM/docker-compose.prod.yml` |
| YOLO | `label_studio_ml/examples/yolo/docker-compose.yml` | `label_studio_ml/examples/yolo/docker-compose.prod.yml` |

## Debugging

Always validate from inside the matching Biowork app container. A host-level
curl does not prove the app container can resolve the backend.

Dev SAM2 example:

```bash
docker exec label-studio-app-dev python -c "import requests; print(requests.get('http://sam2-backend:9090/health', timeout=5).status_code)"
```

Prod/MIB SAM2 example:

```bash
docker exec label-studio-app python -c "import requests; print(requests.get('http://sam2-backend:9090/health', timeout=5).status_code)"
```

If DNS fails, check the backend compose/network attachment before changing
Label Studio project settings. If DNS works but the Model tab still shows
disconnected, refresh backend state from the matching app container:

```bash
docker exec label-studio-app-dev python label_studio/manage.py shell -c "from ml.models import MLBackend; [m.update_state() for m in MLBackend.objects.all()]"
```

Use `docker network connect` only as temporary diagnostics. Persistent fixes
belong in backend compose files, and each backend compose file should join
exactly one Label Studio network for its environment.
