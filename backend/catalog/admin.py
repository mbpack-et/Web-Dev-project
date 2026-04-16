from django.contrib import admin

from .models import Author, Genre, Manga, ReadingList, Review


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ('name',)


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ('name',)


@admin.register(Manga)
class MangaAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'rating', 'status', 'created_by')
    list_filter = ('status', 'genres')
    search_fields = ('title', 'author__name')


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('manga', 'user', 'score', 'created_at')


@admin.register(ReadingList)
class ReadingListAdmin(admin.ModelAdmin):
    list_display = ('user', 'manga', 'status', 'added_at')
