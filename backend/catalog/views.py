from django.contrib.auth.models import User
from django.db.models import Avg
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Author, Genre, Manga, ReadingList, Review
from .serializers import (
    LoginSerializer,
    MangaSerializer,
    MangaSyncSerializer,
    ReadingListSerializer,
    ReviewSerializer,
    UserPublicSerializer,
    UserSerializer,
)


def normalize_catalog_status(raw_status):
    normalized = (raw_status or '').strip().upper()
    if 'COMPLETE' in normalized:
        return 'COMPLETED'
    if 'HIATUS' in normalized or 'PAUSE' in normalized:
        return 'HIATUS'
    return 'ONGOING'


def sync_manga_from_payload(payload: dict, user: User) -> Manga:
    author_name = (payload.get('author') or 'Unknown author').strip() or 'Unknown author'
    author, _ = Author.objects.get_or_create(name=author_name)

    manga, _ = Manga.objects.get_or_create(
        external_id=payload['external_id'],
        defaults={
            'title': payload['title'],
            'author': author,
            'summary': payload.get('summary', ''),
            'status': normalize_catalog_status(payload.get('status')),
            'chapters': payload.get('chapters', 0) or 0,
            'published': payload.get('published', ''),
            'cover_image': payload.get('cover_image', ''),
            'created_by': user,
        },
    )

    manga.title = payload['title']
    manga.author = author
    manga.summary = payload.get('summary', '')
    manga.status = normalize_catalog_status(payload.get('status'))
    manga.chapters = payload.get('chapters', 0) or 0
    manga.published = payload.get('published', '')
    manga.cover_image = payload.get('cover_image', '')
    if not manga.created_by_id:
        manga.created_by = user
    manga.save()

    genre_names = [
        genre_name.strip()
        for genre_name in payload.get('genres', [])
        if genre_name and genre_name.strip()
    ]
    if genre_names:
        genres = [Genre.objects.get_or_create(name=name)[0] for name in genre_names]
        manga.genres.set(genres)

    return manga


def build_auth_payload(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        'user': UserPublicSerializer(user).data,
        'tokens': {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        },
    }


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_user(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(build_auth_payload(user), status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_user(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        return Response(build_auth_payload(user), status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    return Response({'user': UserPublicSerializer(request.user).data})


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
def manga_list(request):
    if request.method == 'GET':
        manga = Manga.objects.all().order_by('-created_at')
        serializer = MangaSerializer(manga, many=True)
        return Response(serializer.data)

    serializer = MangaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def sync_manga(request):
    serializer = MangaSyncSerializer(data=request.data)
    if serializer.is_valid():
        manga = sync_manga_from_payload(serializer.validated_data, request.user)
        return Response(MangaSerializer(manga).data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
def external_review_list(request, external_id):
    manga = get_object_or_404(Manga, external_id=external_id)

    if request.method == 'GET':
        reviews = manga.reviews.select_related('user').order_by('-created_at')
        serializer = ReviewSerializer(reviews, many=True)
        average_score = reviews.aggregate(avg_score=Avg('score'))['avg_score']
        payload = {
            'reviews': serializer.data,
            'average_score': round(average_score, 2) if average_score is not None else None,
            'reviews_count': reviews.count(),
        }

        if request.user.is_authenticated:
            review = reviews.filter(user=request.user).first()
            payload['user_review'] = ReviewSerializer(review).data if review else None

        return Response(payload)

    serializer = ReviewSerializer(data=request.data)
    if serializer.is_valid():
        review, _ = Review.objects.update_or_create(
            manga=manga,
            user=request.user,
            defaults={
                'score': serializer.validated_data['score'],
                'comment': serializer.validated_data.get('comment', ''),
            },
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MangaDetail(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        manga = get_object_or_404(Manga, pk=pk)
        serializer = MangaSerializer(manga)
        return Response(serializer.data)

    def put(self, request, pk):
        manga = get_object_or_404(Manga, pk=pk)
        serializer = MangaSerializer(manga, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        manga = get_object_or_404(Manga, pk=pk)
        manga.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReadingListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        entries = ReadingList.objects.filter(user=request.user).select_related('manga').order_by('-added_at')
        serializer = ReadingListSerializer(entries, many=True)
        return Response(serializer.data)

    def post(self, request):
        external_id = request.data.get('external_id')
        status_value = request.data.get('status', 'PLANNED')

        if not external_id:
            return Response({'detail': 'external_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        manga = get_object_or_404(Manga, external_id=external_id)
        entry, _ = ReadingList.objects.update_or_create(
            user=request.user,
            manga=manga,
            defaults={'status': status_value},
        )
        return Response(ReadingListSerializer(entry).data, status=status.HTTP_200_OK)

    def delete(self, request):
        external_id = request.data.get('external_id')
        if not external_id:
            return Response({'detail': 'external_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        entry = get_object_or_404(ReadingList, user=request.user, manga__external_id=external_id)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def search_manga(request):
    query = request.GET.get('q', '')
    if not query:
        return Response({'error': 'Query parameter q is required'}, status=status.HTTP_400_BAD_REQUEST)
    manga = Manga.objects.filter(title__icontains=query)
    serializer = MangaSerializer(manga, many=True)
    return Response(serializer.data)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'Refresh token required.'}, status=status.HTTP_400_BAD_REQUEST)

        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)
