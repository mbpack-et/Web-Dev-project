# Django Backend for Manga Catalogue

## Setup

1. Create and activate virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Apply migrations:
   ```bash
   python manage.py migrate
   ```
4. Create superuser:
   ```bash
   python manage.py createsuperuser
   ```
5. Run backend on port 8001:
   ```bash
   python manage.py runserver 8001
   ```

## API Endpoints

- `POST /api/auth/login/` - obtain access + refresh tokens
- `POST /api/auth/refresh/` - refresh access token
- `POST /api/auth/logout/` - logout with refresh token
- `GET /api/manga/` - list manga
- `POST /api/manga/` - create manga
- `GET /api/manga/<pk>/` - get manga by id
- `PUT /api/manga/<pk>/` - update manga
- `DELETE /api/manga/<pk>/` - delete manga
- `GET /api/manga/<manga_id>/reviews/` - list reviews
- `POST /api/manga/<manga_id>/reviews/` - create review
- `GET /api/reading-list/` - current user reading list
- `POST /api/reading-list/` - add manga to reading list
- `DELETE /api/reading-list/` - remove manga from reading list

## CORS

Frontend origin allowed: `http://localhost:4200`.
