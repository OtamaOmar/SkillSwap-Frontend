# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Docker

- Build the image

```bash
docker build -t skillswap-frontend:latest .
```

- Run with Docker

```bash
docker run --rm -p 8080:80 skillswap-frontend:latest
```

- Run with Docker Compose

```bash
docker compose up --build
# Visit http://localhost:8080
```

Notes:
- The container serves the built app via Nginx.
- SPA routing is configured to fallback to index.html.

## CI/CD

- CI workflow: .github/workflows/ci.yml
	- Installs dependencies, runs lint, and builds on pushes/PRs to main.
	- Also performs a Docker build test (no push) to validate Dockerfile.

- Docker publish: .github/workflows/docker-publish.yml
	- Builds and pushes the image to GitHub Container Registry (GHCR) on version tags like v1.2.3.
	- Images are published to ghcr.io/<org-or-user>/skillswap-frontend with latest and version tags.
	- No extra secrets are required; uses GITHUB_TOKEN with packages: write permissions.

### Tagging for releases

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Consuming the image

```bash
docker pull ghcr.io/<org-or-user>/skillswap-frontend:latest
docker run -p 8080:80 ghcr.io/<org-or-user>/skillswap-frontend:latest
```

## Full-stack with Docker Compose

This compose file runs the frontend, backend, and PostgreSQL together.

- Services:
	- `frontend`: Nginx serving the built React app, expects `VITE_API_BASE_URL`.
	- `backend`: Node API (image placeholder `otamaomar/skillswap-backend:latest` or build from local backend repo).
	- `db`: PostgreSQL with default credentials in the compose file.

### Configure

1. Copy `.env.example` to `.env` and adjust values if needed.
2. If you want to build the backend locally, edit `docker-compose.yml` to enable the `build:` section and set the correct backend path.

### Run

```bash
docker compose up --build
# Frontend: http://localhost:8080
# Backend:  http://localhost:4000
# Postgres: localhost:5432 (skillswap/skillswap)
```

The frontend talks to the backend via `http://backend:4000` inside the Docker network and `http://localhost:4000` from your host.

Compose builds the backend from the local repo at `/home/mora/github/SkillSwap-Backend` using its `Dockerfile`. Ensure the backend Dockerfile binds to `PORT=4000` and connects to Postgres via `DATABASE_URL`.
