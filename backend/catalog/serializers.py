from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Author, Genre, Manga, ReadingList, Review


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class GenreSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True)


class ReviewSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    manga_title = serializers.CharField(source='manga.title', read_only=True)
    manga_external_id = serializers.CharField(source='manga.external_id', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'manga_title', 'manga_external_id', 'user', 'score', 'comment', 'created_at']
        read_only_fields = ['id', 'manga_title', 'manga_external_id', 'user', 'created_at']


class ReadingListSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    manga_id = serializers.IntegerField(source='manga.id', read_only=True)
    manga_external_id = serializers.CharField(source='manga.external_id', read_only=True)
    manga_title = serializers.CharField(source='manga.title', read_only=True)
    manga_cover_image = serializers.URLField(source='manga.cover_image', read_only=True)

    class Meta:
        model = ReadingList
        fields = [
            'id', 'user', 'manga_id', 'manga_external_id', 'manga_title',
            'manga_cover_image', 'status', 'added_at'
        ]
        read_only_fields = fields


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
            'id', 'external_id', 'title', 'author', 'author_id', 'genres', 'genre_ids',
            'status', 'summary', 'rating', 'chapters', 'published',
            'cover_image', 'created_by', 'created_at',
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


class MangaSyncSerializer(serializers.Serializer):
    external_id = serializers.CharField()
    title = serializers.CharField()
    author = serializers.CharField(required=False, allow_blank=True)
    genres = serializers.ListField(child=serializers.CharField(), required=False)
    summary = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, allow_blank=True)
    chapters = serializers.IntegerField(required=False, min_value=0)
    published = serializers.CharField(required=False, allow_blank=True)
    cover_image = serializers.URLField(required=False, allow_blank=True)
