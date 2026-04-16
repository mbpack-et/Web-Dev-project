from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import Author, Genre, Manga, ReadingList, Review


class GenreSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True)


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    manga = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'manga', 'user', 'score', 'comment', 'created_at']
        read_only_fields = ['id', 'manga', 'user', 'created_at']


class ReadingListSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    manga = serializers.StringRelatedField(read_only=True)
    manga_id = serializers.PrimaryKeyRelatedField(
        queryset=Manga.objects.all(), write_only=True, source='manga'
    )

    class Meta:
        model = ReadingList
        fields = ['id', 'user', 'manga', 'manga_id', 'status', 'added_at']
        read_only_fields = ['id', 'user', 'manga', 'added_at']


class MangaSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=Author.objects.all(), write_only=True, source='author'
    )
    genres = GenreSerializer(many=True, read_only=True)
    genre_ids = serializers.PrimaryKeyRelatedField(
        queryset=Genre.objects.all(), many=True, write_only=True, source='genres'
    )
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Manga
        fields = [
            'id', 'title', 'author', 'author_id', 'genres', 'genre_ids',
            'status', 'summary', 'rating', 'chapters', 'published',
            'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'author', 'genres', 'created_by', 'created_at']

    def create(self, validated_data):
        genres = validated_data.pop('genres', [])
        manga = Manga.objects.create(**validated_data)
        manga.genres.set(genres)
        return manga

    def update(self, instance, validated_data):
        genres = validated_data.pop('genres', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if genres is not None:
            instance.genres.set(genres)
        return instance


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs['username'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError('Unable to log in with provided credentials.')
        attrs['user'] = user
        return attrs
