from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LogoutView,
    MangaDetail,
    ReadingListView,
    current_user,
    external_review_list,
    login_user,
    manga_list,
    register_user,
    search_manga,
    sync_manga,
)

urlpatterns = [
    path('auth/register/', register_user, name='register'),
    path('auth/login/', login_user, name='token_login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='token_logout'),
    path('auth/me/', current_user, name='current_user'),
    path('manga/', manga_list, name='manga_list'),
    path('manga/sync/', sync_manga, name='sync_manga'),
    path('manga/search/', search_manga, name='search_manga'),
    path('manga/external/<str:external_id>/reviews/', external_review_list, name='external_review_list'),
    path('manga/<int:pk>/', MangaDetail.as_view(), name='manga_detail'),
    path('reading-list/', ReadingListView.as_view(), name='reading_list'),
]
