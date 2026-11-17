# Jenkins setup for AUDITO AI

The `Jenkinsfile` in the repo root runs: backend tests -> frontend type-check + build -> deploy to EC2 -> verify https://auditoai.online.

## One-time setup
1. **Plugins**: Pipeline, Git, SSH Agent.
2. **Credential**: Manage Jenkins -> Credentials -> add *SSH Username with private key*.
   - ID: `audito-ec2-ssh`
   - Username: the server user (`ubuntu` or `ec2-user`)
   - Private key: the same key you use to ssh into the EC2 instance.
3. **Agent tools**: git, ssh/scp, tar, python3 (+venv), node 20+ and npm.
4. **Job**: New Item -> Pipeline -> "Pipeline script from SCM" -> your Git repo, branch `feature/anthropic-claude` (or `main`), script path `Jenkinsfile`.
5. **Server**: EC2 security group must allow SSH (22) from the Jenkins machine.
6. Run **Build with Parameters**; check `EC2_HOST`, `EC2_USER`, `DEPLOY_DIR` (the folder holding `docker-compose.yml` and `env/` on the server).

## What the deploy does (and never does)
- Uploads source only. `env/` (secrets), `docker-compose.yml` and `.git` are never overwritten.
- Backs up `env/` + compose to `~/recovery/build-N/` and tags the running images `rollback-build-N`.
- Rebuilds and restarts **only** `frontend` and `backend`. Postgres, Redis, Qdrant, nginx and HTTPS are untouched.
- Never runs `docker compose pull`.
- Health-checks `/api/health` and `/`; on failure it restores the rollback images automatically.

## Manual rollback
```bash
docker tag audito-frontend:rollback-build-N harshpaygude/audito-frontend:latest
docker tag audito-backend:rollback-build-N  harshpaygude/audito-backend:latest
docker compose up -d frontend backend
```
