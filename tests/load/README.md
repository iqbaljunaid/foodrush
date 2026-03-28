# FoodRush Load Tests

Load testing with [k6](https://k6.io/) targeting the order service lifecycle flow.

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Running

### Against local development

```bash
k6 run tests/load/k6-order-flow.js
```

### Against a deployed environment

```bash
TARGET_URL=https://api.foodrush.example.com k6 run tests/load/k6-order-flow.js
```

### Against OKE ingress

```bash
# Get the ingress URL from Terraform outputs
INGRESS_URL=$(cd infra/terraform/compute && terraform output -raw ingress_url)
TARGET_URL="${INGRESS_URL}" k6 run tests/load/k6-order-flow.js
```

### With Docker

```bash
docker run --rm -e TARGET_URL=http://host.docker.internal:3001 \
  -v $(pwd)/tests/load:/scripts \
  grafana/k6 run /scripts/k6-order-flow.js
```

## Test Scenario

The load test ramps up to 1,000 concurrent virtual users executing the full order lifecycle:

1. Create order (POST /orders)
2. Transition: placed -> accepted
3. Transition: accepted -> preparing
4. Transition: preparing -> ready
5. Transition: ready -> picked_up
6. Transition: picked_up -> delivered
7. Verify final state (GET /orders/:id)

### Ramp-up Profile

| Duration | Target VUs |
|----------|-----------|
| 0-30s | 0 -> 250 |
| 30s-1m | 250 -> 500 |
| 1m-2m | 500 -> 1000 |
| 2m-4m | 1000 (sustained) |
| 4m-4m30s | 1000 -> 0 |

## Thresholds

| Metric | Threshold |
|--------|-----------|
| HTTP p95 latency | < 300ms |
| Error rate | < 1% |
| Order creation p95 | < 300ms |
| State transition p95 | < 300ms |

## Output

Results are printed to stdout and saved to `tests/load/summary.json`.
