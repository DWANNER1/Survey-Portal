# Survey Portal (Render-Ready MVP)

This starter project provides:

- A `FastAPI` backend for survey study metadata and filtered aggregations.
- A `Next.js` frontend for subscriber-facing interactive filtering and charting.
- Clerk authentication for subscriber access.
- Saved views per subscriber and CSV export for current filter slice.
- A Postgres schema designed for multi-dimensional, time-series survey analysis.
- A `render.yaml` blueprint for deploying on Render.

## Project Structure

```text
survey-portal/
  backend/
    app/
    sql/
    requirements.txt
  frontend/
    app/
    components/
    lib/
    package.json
  render.yaml
```

## Local Setup

1. Create a Postgres database and set `DATABASE_URL` for backend.
   - Copy `backend/.env.example` to `backend/.env` and update values.
2. Configure Clerk values:
   - Copy `frontend/.env.local.example` to `frontend/.env.local`
   - Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in frontend env
   - Set `CLERK_JWKS_URL` and `CLERK_ISSUER` in backend env
3. Run SQL setup scripts in order:
   - `backend/sql/schema.sql`
   - `backend/sql/seed.sql`
4. Start backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

5. Start frontend:

```bash
cd frontend
npm install
npm run dev
```

6. Set frontend env var:

```bash
cp frontend/.env.local.example frontend/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Render Deployment

Deploy with `render.yaml` Blueprint:

- `survey-portal-db` (Postgres)
- `survey-portal-api` (FastAPI)
- `survey-portal-web` (Next.js)

After creation, set:

- `NEXT_PUBLIC_API_BASE_URL` on `survey-portal-web` to the backend URL
  (example: `https://survey-portal-api.onrender.com`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` on `survey-portal-web`
- `CORS_ALLOW_ORIGINS`, `CLERK_JWKS_URL`, and `CLERK_ISSUER` on `survey-portal-api`

## API Endpoints

- `GET /health`
- `GET /api/studies`
- `GET /api/studies/{study_id}/filters`
- `GET /api/studies/{study_id}/timeseries`
- `GET /api/studies/{study_id}/distribution`
- `GET /api/studies/{study_id}/export.csv` (auth required)
- `GET /api/saved-views?study_id={id}` (auth required)
- `POST /api/saved-views` (auth required)
- `DELETE /api/saved-views/{view_id}` (auth required)

Example:

`/api/studies/1/timeseries?question_code=regulatory_pressure&industry=Healthcare&region=South`

## Notes

- Billing is not included yet. Add Stripe and store subscription status by Clerk user id.
