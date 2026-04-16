from django.conf import settings
from django.db import models


class Author(models.Model):
    name = models.CharField(max_length=200, unique=True)
    biography = models.TextField(blank=True)
    website = models.URLField(blank=True)

    def __str__(self):
        return self.name


class Genre(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class MangaManager(models.Manager):
    def popular(self):
        return self.filter(rating__gte=4.5)

    def by_author(self, author_name: str):
        return self.filter(author__name__iexact=author_name)


class Manga(models.Model):
    STATUS_CHOICES = [
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed'),
        ('HIATUS', 'Hiatus'),
    ]

    title = models.CharField(max_length=255)
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name='manga')
    genres = models.ManyToManyField(Genre, related_name='manga')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ONGOING')
    summary = models.TextField(blank=True)
    rating = models.FloatField(default=0.0)
    chapters = models.PositiveIntegerField(default=0)
    published = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_manga')
    created_at = models.DateTimeField(auto_now_add=True)

    objects = MangaManager()

    def __str__(self):
        return self.title


class Review(models.Model):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 11)]

    manga = models.ForeignKey(Manga, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    score = models.PositiveSmallIntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user} review for {self.manga}'


class ReadingList(models.Model):
    STATUS_CHOICES = [
        ('PLANNED', 'Planned'),
        ('READING', 'Reading'),
        ('COMPLETED', 'Completed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reading_list')
    manga = models.ForeignKey(Manga, on_delete=models.CASCADE, related_name='reading_entries')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNED')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'manga')

    def __str__(self):
        return f'{self.user} - {self.manga} ({self.status})'
