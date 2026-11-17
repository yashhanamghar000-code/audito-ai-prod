# Run AUDITO AI on your own machine

## You need
- Docker Desktop (running), with at least 8 GB RAM given to Docker and ~10 GB free disk
- Your **own Anthropic API key** (https://console.anthropic.com -> API keys). This is the only external key the app needs.
- Port 8000 free

## Steps
```powershell
git clone <repo-url> AUDITO
cd AUDITO
git checkout feature/anthropic-claude
powershell -ExecutionPolicy Bypass -File .\setup-env.ps1     # asks for your key, creates env\
docker compose up --build -d                                  # first build takes 10-20 min
docker compose ps                                             # wait until everything is Up
```
Open **http://localhost:8000**, click *Create an account*, upload a PDF and ask a question.
(macOS/Linux: run `./setup-env.sh` instead of the .ps1.)

## First start
The embeddings and reranker services load their models on first boot (1-3 minutes). `docker compose up` now
waits for them (healthchecks), and the worker retries uploads for ~2 minutes if a service is still starting,
so an upload right after boot no longer fails. Watch progress with `docker compose ps` (look for `healthy`).

## Notes
- The first build downloads the embedding and reranker models, so it needs internet.
- Never commit the `env/` folder or share it: it holds your API key. It is gitignored.
- Stop: `docker compose down` - wipe all data: `docker compose down -v`.
- Do not run `docker compose pull`; images are built locally.
