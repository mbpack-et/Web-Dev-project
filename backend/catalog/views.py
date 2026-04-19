from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Manga, ReadingList, Review
from .serializers import MangaSerializer, ReadingListSerializer, ReviewSerializer, UserSerializer


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_user(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': serializer.data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
def review_list(request, manga_id):
    manga = get_object_or_404(Manga, pk=manga_id)
    if request.method == 'GET':
        reviews = manga.reviews.all()
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    serializer = ReviewSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user, manga=manga)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
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
        entries = ReadingList.objects.filter(user=request.user)
        serializer = ReadingListSerializer(entries, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ReadingListSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        manga_id = request.data.get('manga_id')
        entry = get_object_or_404(ReadingList, user=request.user, manga_id=manga_id)
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
