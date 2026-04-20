🎬 MangaBase — Manga Database

Created by: Talaptan Alikhan, Mamedov Niyaz, Tynyshtyk Alis

📌 Project Description

MangaBase is a web application designed for manga fans to explore, manage, and interact with a curated database of manga titles. The platform allows users to browse manga, view detailed information, leave ratings and comments, and manage their personal reading lists.

This project is built as a full-stack application using Angular (frontend) and Django + Django REST Framework (backend), with secure user authentication powered by JWT.

## Local development (run all three)

Use **three terminals**. Order does not matter, but the UI needs every service running before catalog and auth work end-to-end.

### 1. Django API (port 8000)

```bash
cd backend
python3 -m venv .venv          # optional, first time only
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### 2. MangaHook catalog API (port 3000)

The Node app lives in **`mangahook-api/server`** (not the repo root of `mangahook-api`).

```bash
cd mangahook-api/server
npm install
npm start
```

From the **`mangahook-api`** folder you can instead run:

```bash
npm run setup    # first time: installs dependencies in server/
npm start
```

Port is set in `mangahook-api/server/.env` (`PORT=3000` by default). The Angular dev server proxies `/api/mangahook` to this port.

### 3. Angular frontend (port 4200)

```bash
cd manga-catalogue
npm install
npx ng serve
```

Open **http://localhost:4200**. The app uses `proxy.conf.json`: `/api/auth` → Django, `/api/mangahook` → MangaHook.

### API tests (Postman)

Import [`backend/MangaCatalogue-Postman-Collection.json`](backend/MangaCatalogue-Postman-Collection.json) into Postman. After **Login** or **Register**, copy `access` and `refresh` into the collection variables `access_token` and `refresh_token`.

---

<div align="center">
<kbd>
  <img src="https://image.myanimelist.net/ui/aLzWa1AdfbM7yOgXZ45LWZ6mrL19J_OUf49UgZPgSd6mjfrQpEdGyPdVkEZHOoo_" width="500" alt="Manga illustration" />
</kbd>
</div>
