from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import LogoutView, MangaDetail, ReadingListView, manga_list, register_user, review_list, search_manga

urlpatterns = [
    path('auth/register/', register_user, name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='token_logout'),
    path('manga/', manga_list, name='manga_list'),
    path('manga/search/', search_manga, name='search_manga'),
    path('manga/<int:pk>/', MangaDetail.as_view(), name='manga_detail'),
    path('manga/<int:manga_id>/reviews/', review_list, name='review_list'),
    path('reading-list/', ReadingListView.as_view(), name='reading_list'),
]
