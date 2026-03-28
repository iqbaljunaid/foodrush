# UberEats OCI Platform — Claude Code Swarm Plan

## Project overview

Build a production-grade UberEats-style food delivery platform on Oracle Cloud
Infrastructure (OCI) using a multi-agent swarm. Six bounded-context services run
on OCI Container Engine for Kubernetes (OKE). All agents share this CLAUDE.md as
ground truth for architecture decisions, naming conventions, and coding standards.

## Swarm configuration

Enable agent teams before starting:

```jsonc
// .claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Activate with:

```bash
npm update -g @anthropic-ai/claude-code
claude
```

---

## Agent team roster

| Role | Agent name | Bounded context | Worktree |
|---|---|---|---|
| **Team lead** | `orchestrator` | Cross-cutting, planning, synthesis | `main` |
| Worker | `edge-agent` | OCI edge layer, API Gateway, WAF | `worktree/edge` |
| Worker | `user-agent` | User service, auth, session | `worktree/user-svc` |
| Worker | `order-agent` | Order service, state machine | `worktree/order-svc` |
| Worker | `dispatch-agent` | Dispatch, Location, ETA, Routing | `worktree/dispatch-svc` |
| Worker | `data-agent` | All OCI data stores, schemas, migrations | `worktree/data-layer` |
| Worker | `infra-agent` | Terraform/OCI, OKE, VCN, observability | `worktree/infra` |
| Worker | `test-agent` | Integration tests, contract tests, CI pipeline | `worktree/tests` |

---

## Architecture decisions (binding on all agents)

### Tech stack

- **Runtime:** Node.js 22 (TypeScript 5) for all services
- **Framework:** Fastify v5 — chosen for OCI ARM performance
- **Container:** Docker, OCI Container Registry (OCIR)
- **Orchestration:** OKE (Kubernetes 1.32)
- **Service mesh:** OCI Service Mesh (Envoy sidecar, mTLS)
- **Event bus:** OCI Streaming (Kafka-compatible, topic-per-domain)
- **IaC:** Terraform 1.9 + OCI provider

### OCI resource naming convention

```
<project>-<env>-<resource>-<suffix>
ubereats-prod-oke-cluster-01
ubereats-prod-vcn-main
ubereats-prod-mysql-primary
```

### Git worktree isolation

Each worker agent gets its own Git worktree. No agent touches files outside its
assigned worktree. The orchestrator merges via PR after the quality gate passes.

```bash
git worktree add worktree/edge           -b feat/edge-layer
git worktree add worktree/user-svc       -b feat/user-service
git worktree add worktree/order-svc      -b feat/order-service
git worktree add worktree/dispatch-svc   -b feat/dispatch-service
git worktree add worktree/data-layer     -b feat/data-layer
git worktree add worktree/infra          -b feat/infra
git worktree add worktree/tests          -b feat/tests
```

### Code standards

- Strict TypeScript — `"strict": true`, no `any`
- ESLint + Prettier enforced in CI
- Every service exposes `/healthz` (liveness) and `/readyz` (readiness)
- OpenAPI 3.1 spec committed alongside each service (`openapi.yaml`)
- All secrets via OCI Vault — never hardcoded or in env files

---

## Task list (shared pool — agents claim and update status)

### Wave 1 — Infrastructure foundation (parallel, no dependencies)

| ID | Task | Owner | Status |
|---|---|---|---|
| T01 | Terraform: VCN, subnets, IGW, NSGs | `infra-agent` | pending |
| T02 | Terraform: OKE cluster + node pools (AD-1, AD-2) | `infra-agent` | pending |
| T03 | Terraform: OCI MySQL HeatWave primary + read replica | `data-agent` | pending |
| T04 | Terraform: OCI NoSQL DB tables (catalogue, menus) | `data-agent` | pending |
| T05 | Terraform: OCI Streaming topics (order, dispatch, notification) | `data-agent` | pending |
| T06 | Terraform: OCI Cache cluster (Redis-compatible) | `data-agent` | pending |
| T07 | Terraform: OCI Vault + KMS key rings | `infra-agent` | pending |
| T08 | Terraform: OCIR repositories per service | `infra-agent` | pending |

### Wave 2 — Service scaffolding (parallel, depends on Wave 1)

| ID | Task | Owner | Status | Blocked by |
|---|---|---|---|---|
| T09 | Scaffold user-service: Fastify, JWT, OCI IAM IDCS integration | `user-agent` | pending | T01,T07 |
| T10 | Scaffold order-service: state machine (placed→accepted→picked→delivered) | `order-agent` | pending | T03 |
| T11 | Scaffold catalogue-service: menu CRUD, image upload to OCI Object Storage | `user-agent` | pending | T04 |
| T12 | Scaffold dispatch-service: courier matching, GPS ingestion (WebSocket) | `dispatch-agent` | pending | T05,T06 |
| T13 | Scaffold location-service: Redis geospatial, geofence triggers | `dispatch-agent` | pending | T06 |
| T14 | Scaffold notification-service: OCI Notification Service (push/SMS/email) | `order-agent` | pending | T05 |
| T15 | Scaffold payment-service: Stripe SDK, idempotency keys, refund flow | `order-agent` | pending | T03,T07 |
| T16 | OCI API Gateway: routes, JWT authorizer, rate limiting policies | `edge-agent` | pending | T09 |

### Wave 3 — Integration & mesh (depends on Wave 2)

| ID | Task | Owner | Status | Blocked by |
|---|---|---|---|---|
| T17 | OCI Service Mesh: VirtualService + DestinationRule per service | `infra-agent` | pending | T09–T16 |
| T18 | Kafka consumers: order.placed → dispatch + notification fan-out | `order-agent` | pending | T10,T12,T14 |
| T19 | Kafka consumers: courier.assigned → ETA recalc + customer push | `dispatch-agent` | pending | T12,T13 |
| T20 | OCI Load Balancer + WAF rules: OWASP top-10, DDoS thresholds | `edge-agent` | pending | T16 |
| T21 | Kubernetes manifests: Deployments, HPA, PodDisruptionBudget, all services | `infra-agent` | pending | T09–T16 |
| T22 | OCI APM + Logging: traces, dashboards, alert rules | `infra-agent` | pending | T21 |

### Wave 4 — Quality gate (depends on Wave 3)

| ID | Task | Owner | Status | Blocked by |
|---|---|---|---|---|
| T23 | Integration test suite: order lifecycle end-to-end | `test-agent` | pending | T18 |
| T24 | Contract tests: OpenAPI diff check between services | `test-agent` | pending | T09–T16 |
| T25 | Load test: k6 script, 1 000 concurrent orders, p95 < 300 ms | `test-agent` | pending | T21 |
| T26 | Security scan: SAST (Semgrep) + SCA (Trivy) in CI | `test-agent` | pending | T09–T16 |
| T27 | Orchestrator synthesis: merge all worktrees, resolve conflicts, final PR | `orchestrator` | pending | T23–T26 |

---

## Inter-agent communication protocol

Agents use the Teammate inbox for coordination. Format every message as:

```
TO: <agent-name>
RE: T<id> — <subject>
STATUS: blocked | needs-review | done
BODY:
<concise update, max 5 lines>
```

Example handoff from `order-agent` to `dispatch-agent`:

```
TO: dispatch-agent
RE: T18 — order.placed consumer ready
STATUS: done
BODY:
Consumer is live at src/consumers/order-placed.consumer.ts.
Emits CourierAssignmentRequestedEvent on topic dispatch.courier-requests.
Schema at src/events/courier-assignment-requested.schema.ts — please
align your producer to this shape before T19.
```

---

## File ownership map

| Path | Owner agent |
|---|---|
| `infra/terraform/**` | `infra-agent` |
| `infra/k8s/**` | `infra-agent` |
| `services/user-service/**` | `user-agent` |
| `services/catalogue-service/**` | `user-agent` |
| `services/order-service/**` | `order-agent` |
| `services/payment-service/**` | `order-agent` |
| `services/notification-service/**` | `order-agent` |
| `services/dispatch-service/**` | `dispatch-agent` |
| `services/location-service/**` | `dispatch-agent` |
| `edge/**` | `edge-agent` |
| `tests/**` | `test-agent` |
| `CLAUDE.md`, `docs/**` | `orchestrator` |

---

## Orchestrator spawn prompt

```
You are the team lead for the ubereats-oci swarm.

Goal: implement the UberEats OCI platform as specified in CLAUDE.md.

Your responsibilities:
1. Create the task pool from the Wave 1–4 table in CLAUDE.md.
2. Spawn all worker agents with the spawn prompts below.
3. Monitor the task list; unblock dependent tasks as waves complete.
4. After Wave 4 passes, merge all worktrees, resolve conflicts, and
   open the final PR with a summary comment.

Do not write production code yourself — delegate all implementation to workers.
Use Teammate broadcast to announce wave transitions.
```

---

## Worker spawn prompts

### edge-agent

```
You are edge-agent on the ubereats-oci swarm.
Working directory: worktree/edge
File ownership: edge/**

Read CLAUDE.md for architecture decisions and file ownership rules.
Claim and complete T16, T20 from the task list in that order.
Send status updates to orchestrator via Teammate write after each task.
Do not edit files outside worktree/edge.
```

### user-agent

```
You are user-agent on the ubereats-oci swarm.
Working directory: worktree/user-svc
File ownership: services/user-service/**, services/catalogue-service/**

Read CLAUDE.md for architecture decisions and file ownership rules.
Claim and complete T09, T11 from the task list.
After T09 is done, message order-agent: auth middleware is exported
from @ubereats/user-service/middleware so they can protect their routes.
Send status to orchestrator after each task completes.
```

### order-agent

```
You are order-agent on the ubereats-oci swarm.
Working directory: worktree/order-svc
File ownership: services/order-service/**, services/payment-service/**,
               services/notification-service/**

Read CLAUDE.md for architecture decisions and file ownership rules.
Claim T10, T14, T15 in Wave 2, then T18 in Wave 3.
T10 must implement the FSM: placed → accepted → preparing → ready →
picked_up → delivered | cancelled.
Each state transition publishes an event to OCI Streaming.
Send status to orchestrator after each task. Coordinate with
dispatch-agent on shared event schemas before starting T18.
```

### dispatch-agent

```
You are dispatch-agent on the ubereats-oci swarm.
Working directory: worktree/dispatch-svc
File ownership: services/dispatch-service/**, services/location-service/**

Read CLAUDE.md for architecture decisions and file ownership rules.
Claim T12, T13 in Wave 2, then T19 in Wave 3.
T12 must accept courier GPS pings via WebSocket and publish
location.updated events to OCI Streaming.
T13 must use Redis GEOADD/GEORADIUS for courier proximity queries.
Coordinate with order-agent on dispatch.courier-requests topic schema
before starting T19.
Send status to orchestrator after each task.
```

### data-agent

```
You are data-agent on the ubereats-oci swarm.
Working directory: worktree/data-layer
File ownership: infra/terraform/data-stores/**

Read CLAUDE.md for architecture decisions and file ownership rules.
Claim T03, T04, T05, T06 in Wave 1 (all parallel — no dependencies).
Write separate Terraform modules for each store under
infra/terraform/data-stores/<store-name>/.
Output connection strings as Terraform outputs; infra-agent will
wire them into OCI Vault.
Send status to orchestrator when all four tasks complete.
```

### infra-agent

```
You are infra-agent on the ubereats-oci swarm.
Working directory: worktree/infra
File ownership: infra/terraform/network/**, infra/terraform/compute/**,
               infra/terraform/security/**, infra/k8s/**

Read CLAUDE.md for architecture decisions and file ownership rules.
Wave 1: claim T01, T02, T07, T08 in parallel.
Wave 3: claim T17, T21, T22 after Wave 2 signals complete.
All Terraform must pass `terraform validate` and `tflint` before marking done.
All K8s manifests must pass `kubeconform` schema validation.
Send status to orchestrator after each wave's tasks complete.
```

### test-agent

```
You are test-agent on the ubereats-oci swarm.
Working directory: worktree/tests
File ownership: tests/**

Read CLAUDE.md for architecture decisions and file ownership rules.
Wait for orchestrator to broadcast "Wave 3 complete" before starting.
Claim T23, T24, T25, T26 — run them in parallel where possible.
T25 k6 script must target the OKE ingress URL from infra/terraform outputs.
T26 Semgrep + Trivy must run in the GitHub Actions workflow at
.github/workflows/security.yml.
Report all failures to orchestrator with file + line references.
```

---

## Quality gate criteria (test-agent enforces)

| Criterion | Threshold |
|---|---|
| Order lifecycle e2e | All 6 state transitions pass |
| OpenAPI contract diff | Zero breaking changes between services |
| p95 latency under load | < 300 ms at 1 000 concurrent users |
| SAST findings | Zero critical, zero high |
| SCA CVEs | Zero critical in runtime dependencies |
| Terraform plan | Zero destroy actions on protected resources |

---

## Repo structure (target)

```
ubereats-oci/
├── CLAUDE.md                        ← this file (orchestrator owns)
├── .claude/
│   └── settings.json                ← CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
├── services/
│   ├── user-service/
│   ├── catalogue-service/
│   ├── order-service/
│   ├── payment-service/
│   ├── notification-service/
│   ├── dispatch-service/
│   └── location-service/
├── edge/
│   ├── api-gateway/                 ← OCI API Gateway Terraform + policies
│   └── waf/                         ← WAF rule sets
├── infra/
│   ├── terraform/
│   │   ├── network/
│   │   ├── compute/
│   │   ├── data-stores/
│   │   └── security/
│   └── k8s/
│       └── <service>-deployment.yaml
├── tests/
│   ├── integration/
│   ├── contract/
│   ├── load/
│   └── security/
└── docs/
    └── architecture/
```

---

## How to start the swarm

```bash
# 1. Update Claude Code
npm update -g @anthropic-ai/claude-code

# 2. Create settings file
mkdir -p .claude
cat > .claude/settings.json << 'EOF'
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
EOF

# 3. Create git worktrees
git init ubereats-oci && cd ubereats-oci
git commit --allow-empty -m "chore: init"
git worktree add worktree/edge          -b feat/edge-layer
git worktree add worktree/user-svc      -b feat/user-service
git worktree add worktree/order-svc     -b feat/order-service
git worktree add worktree/dispatch-svc  -b feat/dispatch-service
git worktree add worktree/data-layer    -b feat/data-layer
git worktree add worktree/infra         -b feat/infra
git worktree add worktree/tests         -b feat/tests

# 4. Start Claude Code and paste the orchestrator spawn prompt
claude
```

Paste the **Orchestrator spawn prompt** above. Claude Code will create the task
pool, spawn all worker agents, and coordinate wave execution automatically.
