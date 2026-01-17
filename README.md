## Dazabaze — Semester project

Frontend: **Next.js (React)**  
Backend: **Rust (Actix-Web) API server** + **MongoDB**

The React UI uses **custom hooks** to call the Rust API (login/signup, orgs, issues).

### MongoDB collections (requirements)

Two required collections (plus an extra `users` collection for login):

- **`organizations`** (required)
  - Fields: `_id`, `name`, `key`, `ownerId`, `memberIds`
  - Seeded with **5+** documents
- **`issues`** (required)
  - Fields: `_id`, `organizationId`, `title`, `description`, `status`, `parentIssueId`
  - Seeded with **5+** documents
  - **Common field**: `issues.organizationId` references `organizations._id`
  - **Text index**: on `title`, `description` (used by the search endpoint)
- **`users`** (extra, for login)
  - Fields: `_id`, `email`, `name`, `password_hash`

### API endpoints (requirements)

- `GET /api/issues?organizationId=...` — get all issues (one collection)
- `GET /api/issues/{id}` — get one issue by id
- `GET /api/organizations/{id}` — get one organization by id
- `GET /api/issues/search?q=...&organizationId=...` — search issues (text index)
- `POST /api/issues` — add issue
- `PUT /api/issues/{id}` — edit issue
- `DELETE /api/issues/{id}` — delete issue

Extra endpoint (UI convenience):
- `GET /api/organizations` — list organizations for the current user

### Run locally

Prereqs:
- MongoDB running (local or Atlas)
- Rust toolchain installed
- Node.js installed

1) Create `backend/.env` (copy `backend/env.example`):

- `MONGO_URI=...`
- `MONGO_DB=dazabaze`
- `PORT=3001`
- `WEB_ORIGIN=http://localhost:3000`
- `JWT_SECRET=change-me`

Seed the DB (creates collections + 5+ docs each + text index):

```bash
cd backend
cargo run --bin seed
```

2) Start the Rust API:

```bash
cd backend
cargo run --bin backend
```

3) Create `.env.local` in the repo root (copy `env.example`):

- `NEXT_PUBLIC_API_BASE=http://localhost:3001`

4) Run the Next.js app:

```bash
npm run dev
```

Open `http://localhost:3000`.

### Client app behavior (requirements)

- **Home screen** (`/`)
  - Loads all issues for the selected organization by default
  - Search filters issues via the search endpoint
  - Selecting an issue opens Details
  - “New” opens Details in create mode
- **Details screen** (`/issues/[id]` or `/issues/new`)
  - Shows issue info
  - Shows linked organization details using `organizationId`
  - Shows **sub-issues** via `parentIssueId`
  - Buttons:
    - **Edit** (update)
    - **Delete** (delete)
    - **New** (create mode only)
  - After action, navigates back to Home and refreshes
