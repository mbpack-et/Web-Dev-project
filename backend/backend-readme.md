# Django Backend for Manga Catalogue

## Установка

1. Создайте виртуальное окружение:
   ```bash
   python -m venv venv
   source ./venv/Scripts/activate
   ```
2. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```
3. Выполните миграции:
   ```bash
   python manage.py migrate
   ```
4. Создайте суперпользователя:
   ```bash
   python manage.py createsuperuser
   ```
5. Запустите сервер:
   ```bash
   python manage.py runserver
   ```

## Конечные точки API

- `POST /api/auth/login/` — получить токен доступа и refresh токен
- `POST /api/auth/refresh/` — обновить токен доступа
- `POST /api/auth/logout/` — разлогиниться
- `GET /api/manga/` — список манги
- `POST /api/manga/` — создать мангу
- `GET /api/manga/<pk>/` — получить мангу
- `PUT /api/manga/<pk>/` — обновить мангу
- `DELETE /api/manga/<pk>/` — удалить мангу
- `GET /api/manga/<manga_id>/reviews/` — список отзывов
- `POST /api/manga/<manga_id>/reviews/` — создать отзыв
- `GET /api/reading-list/` — список чтений пользователя
- `POST /api/reading-list/` — добавить мангу в лист
- `DELETE /api/reading-list/` — удалить из листа

## CORS

Разрешены запросы с `http://localhost:4200`.
