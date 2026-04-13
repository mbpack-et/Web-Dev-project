🎬 MangaBase — Manga Database

Created by: Talaptan Alikhan, Mamedov Niyaz, Tynyshtyk Alis

📌 Project Description

MangaBase is a web application designed for manga fans to explore, manage, and interact with a curated database of manga titles. The platform allows users to browse manga, view detailed information, leave ratings and comments, and manage their personal reading lists.

This repository now includes an Angular frontend and a Django + Django REST Framework backend located in `manga-catalogue/backend`.

The backend supports JWT authentication, manga CRUD, reviews, and user reading lists. See `manga-catalogue/backend/README.md` for setup instructions.

## Project Structure

- `manga-catalogue/` - Angular app (frontend)
- `manga-catalogue/src/app/features/` - main pages (`login`, `dashboard`, `profile`, `catalog`)
- `manga-catalogue/src/app/core/` - auth guard + data store service
- `manga-catalogue/backend/` - Django + DRF backend
- `manga-catalogue/backend/catalog/` - models, serializers, views, urls
- `manga-catalogue/backend/mangabackend/` - Django project settings and root urls

<div align="center">
<kbd>

  <img src="https://image.myanimelist.net/ui/aLzWa1AdfbM7yOgXZ45LWZ6mrL19J_OUf49UgZPgSd6mjfrQpEdGyPdVkEZHOoo_" width="500"/>
</a>
</kbd>

</div>
