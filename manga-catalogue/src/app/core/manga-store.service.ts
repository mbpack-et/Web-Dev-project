import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  ApiFilterOption,
  AuthResponse,
  FRIENDS_LIST,
  FriendEntry,
  MangaDetailResponse,
  MangaEntry,
  MangaListResponse,
  MangaStatus,
  PanelTone,
  ReadingListEntryResponse,
  ReviewSummaryResponse
} from './manga-data';

const API_BASE_PATH = '/api/mangahook';
const DJANGO_API_BASE_PATH = '/api';
const AUTH_STORAGE_KEY = 'manga-catalogue-auth';
const ACCENT_ROTATION: readonly PanelTone[] = ['plum', 'indigo', 'sky', 'gold'];

type ReadingListStatus = 'PLANNED' | 'READING' | 'COMPLETED';
type AuthSession = {
  access: string;
  refresh: string;
  userName: string;
};

@Injectable({ providedIn: 'root' })
export class MangaStoreService {
  private readonly http = inject(HttpClient);
  private readonly pendingDetailIds = new Set<string>();

  private readonly authSession = signal<AuthSession | null>(null);
  private readonly availableCategoryOptions = signal<ApiFilterOption[]>([]);
  private readonly detailCache = signal<Record<string, MangaDetailResponse>>({});
  private readonly readingListStatuses = signal<Record<string, MangaStatus>>({});
  private readonly reviewAverages = signal<Record<string, number>>({});

  readonly isAuthenticated = computed(() => !!this.authSession());
  readonly userName = computed(() => this.authSession()?.userName ?? 'Guest');

  readonly mangaLibrary = signal<MangaEntry[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly selectedGenre = signal('All Genres');
  readonly loadedOnce = signal(false);
  readonly favoriteIds = signal<string[]>([]);
  readonly userRatings = signal<Record<string, number>>({});

  constructor() {
    this.restoreSession();
    if (this.isAuthenticated()) {
      void this.loadUserState();
    }
  }

  readonly friends = computed<FriendEntry[]>(() => {
    const library = this.mangaLibrary();

    return FRIENDS_LIST.map((friend, index) => ({
      ...friend,
      currentlyReading: library[index % Math.max(library.length, 1)]?.title ?? 'Updating shelf...'
    }));
  });

  readonly genreOptions = computed(() => {
    const categories = this.availableCategoryOptions()
      .map((option) => this.getOptionLabel(option))
      .filter(Boolean)
      .filter((name) => name.toUpperCase() !== 'ALL');

    return ['All Genres', ...categories];
  });

  readonly lastManga = computed(() => {
    const readingIds = Object.entries(this.readingListStatuses())
      .filter(([, status]) => status === 'Reading')
      .map(([id]) => id);

    const libraryById = new Map(this.mangaLibrary().map((item) => [item.id, item]));
    const readingSeries = readingIds
      .map((id) => libraryById.get(id) ?? this.buildEntryFromDetail(id, this.detailCache()[id]))
      .filter((item): item is MangaEntry => !!item);

    return readingSeries[0] ?? this.mangaLibrary()[0] ?? null;
  });

  readonly popularNow = computed(() =>
    [...this.mangaLibrary()].sort((left, right) => right.popularity - left.popularity)[0] ?? null
  );

  readonly recommendations = computed(() => {
    const excludedIds = new Set(
      [this.lastManga()?.id, this.popularNow()?.id].filter((value): value is string => !!value)
    );

    return this.mangaLibrary()
      .filter((item) => !excludedIds.has(item.id))
      .sort((left, right) => right.popularity - left.popularity)
      .slice(0, 3);
  });

  readonly favorites = computed(() => {
    const libraryById = new Map(this.mangaLibrary().map((item) => [item.id, item]));

    return this.favoriteIds()
      .map((id) => {
        const libraryEntry = libraryById.get(id);

        if (libraryEntry) {
          return libraryEntry;
        }

        const cachedDetail = this.detailCache()[id];
        return cachedDetail ? this.buildEntryFromDetail(id, cachedDetail) : null;
      })
      .filter((item): item is MangaEntry => !!item);
  });

  accessToken(): string {
    return this.authSession()?.access ?? '';
  }

  async login(userName: string, password: string): Promise<boolean> {
    if (!userName.trim() || !password.trim()) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${DJANGO_API_BASE_PATH}/auth/login/`, {
          username: userName.trim(),
          password
        })
      );

      this.applyAuthResponse(response);
      await this.loadUserState();
      return true;
    } catch {
      return false;
    }
  }

  async register(username: string, email: string, password: string): Promise<boolean> {
    if (!username.trim() || !email.trim() || !password.trim()) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${DJANGO_API_BASE_PATH}/auth/register/`, {
          username: username.trim(),
          email: email.trim(),
          password
        })
      );

      this.applyAuthResponse(response);
      await this.loadUserState();
      return true;
    } catch {
      return false;
    }
  }

  logout(): void {
    const refreshToken = this.authSession()?.refresh;

    if (refreshToken) {
      this.http
        .post(`${DJANGO_API_BASE_PATH}/auth/logout/`, { refresh: refreshToken })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }

    this.clearAuthState();
  }

  ensureCatalogLoaded(): void {
    if (this.isLoading() || this.loadedOnce()) {
      return;
    }

    this.loadCatalog();
  }

  ensureMangaDetail(id: string): void {
    if (!id || this.detailCache()[id] || this.pendingDetailIds.has(id)) {
      if (id && this.isAuthenticated()) {
        void this.loadReviewSummary(id);
      }
      return;
    }

    this.pendingDetailIds.add(id);

    this.http
      .get<MangaDetailResponse>(`${API_BASE_PATH}/manga/${id}`)
      .pipe(catchError(() => of(null)))
      .subscribe((detail) => {
        this.pendingDetailIds.delete(id);

        if (!detail) {
          return;
        }

        this.detailCache.update((cache) => ({ ...cache, [id]: detail }));
        this.upsertMangaFromDetail(id, detail);

        if (this.isAuthenticated()) {
          void this.loadReviewSummary(id);
        }
      });
  }

  loadCatalog(genre = this.selectedGenre(), page = 1): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.selectedGenre.set(genre);

    let params = new HttpParams().set('page', String(page));
    const apiGenre = genre === 'All Genres' ? null : genre;

    if (apiGenre) {
      params = params.set('category', apiGenre);
    }

    this.http
      .get<MangaListResponse>(`${API_BASE_PATH}/mangaList`, { params })
      .subscribe({
        next: (response) => {
          this.availableCategoryOptions.set(response.metaData.category ?? []);
          this.totalPages.set(response.metaData.totalPages ?? 1);
          this.currentPage.set(page);

          const detailRequests = response.mangaList.map((item) =>
            this.http.get<MangaDetailResponse>(`${API_BASE_PATH}/manga/${item.id}`).pipe(
              catchError(() =>
                of({
                  imageUrl: item.image,
                  name: item.title,
                  author: 'Unknown author',
                  description: item.description,
                  year: null,
                  status: 'Ongoing',
                  updated: `Updated: ${new Date().getFullYear()}`,
                  view: item.view,
                  genres: apiGenre ? [apiGenre] : [],
                  chapterList: []
                } satisfies MangaDetailResponse)
              ),
              catchError(() => of(null))
            )
          );

          if (!detailRequests.length) {
            this.mangaLibrary.set([]);
            this.loadedOnce.set(true);
            this.isLoading.set(false);
            return;
          }

          forkJoin(detailRequests).subscribe({
            next: (details) => {
              this.detailCache.update((cache) => ({
                ...cache,
                ...response.mangaList.reduce<Record<string, MangaDetailResponse>>((accumulator, item, index) => {
                  const detail = details[index];

                  if (detail) {
                    accumulator[item.id] = detail;
                  }

                  return accumulator;
                }, {})
              }));

              this.mangaLibrary.set(
                response.mangaList.map((item, index) =>
                  this.toMangaEntry(item, details[index] ?? null, index)
                )
              );
              this.loadedOnce.set(true);
              this.isLoading.set(false);
            },
            error: () => {
              this.mangaLibrary.set([]);
              this.loadedOnce.set(true);
              this.isLoading.set(false);
              this.errorMessage.set(
                'The MangaHook catalog loaded, but item details could not be enriched.'
              );
            }
          });
        },
        error: () => {
          this.mangaLibrary.set([]);
          this.totalPages.set(1);
          this.loadedOnce.set(true);
          this.isLoading.set(false);
          this.errorMessage.set(
            'MangaHook could not be reached. Start the backend on http://localhost:3000 or update the proxy target.'
          );
        }
      });
  }

  getMangaById(id: string): MangaEntry | null {
    const libraryEntry = this.mangaLibrary().find((item) => item.id === id);

    if (libraryEntry) {
      return libraryEntry;
    }

    const cachedDetail = this.detailCache()[id];
    return cachedDetail ? this.buildEntryFromDetail(id, cachedDetail) : null;
  }

  getMangaDetail(id: string): MangaDetailResponse | null {
    return this.detailCache()[id] ?? null;
  }

  getAverageRating(id: string): number | null {
    return this.reviewAverages()[id] ?? null;
  }

  isFavorite(id: string): boolean {
    return this.favoriteIds().includes(id);
  }

  getUserRating(id: string): number {
    return this.userRatings()[id] ?? 0;
  }

  async toggleFavorite(id: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    const synced = await this.syncRemoteManga(id);
    if (!synced) {
      this.errorMessage.set('Не удалось сохранить тайтл в backend.');
      return false;
    }

    try {
      if (this.isFavorite(id)) {
        await firstValueFrom(
          this.http.delete(`${DJANGO_API_BASE_PATH}/reading-list/`, {
            body: { external_id: id }
          })
        );
        this.favoriteIds.update((ids) => ids.filter((currentId) => currentId !== id));
        this.readingListStatuses.update((entries) => {
          const next = { ...entries };
          delete next[id];
          return next;
        });
      } else {
        await firstValueFrom(
          this.http.post<ReadingListEntryResponse>(`${DJANGO_API_BASE_PATH}/reading-list/`, {
            external_id: id,
            status: 'PLANNED'
          })
        );
        this.favoriteIds.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
        this.readingListStatuses.update((entries) => ({ ...entries, [id]: 'Plan to Read' }));
      }

      this.refreshDerivedLibrary();
      return true;
    } catch {
      this.errorMessage.set('Не удалось обновить reading list.');
      return false;
    }
  }

  async setUserRating(id: string, rating: number): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    const synced = await this.syncRemoteManga(id);
    if (!synced) {
      this.errorMessage.set('Не удалось связать тайтл с backend.');
      return false;
    }

    try {
      await firstValueFrom(
        this.http.post(`${DJANGO_API_BASE_PATH}/manga/external/${id}/reviews/`, {
          score: rating,
          comment: ''
        })
      );

      this.userRatings.update((ratings) => ({ ...ratings, [id]: rating }));
      await this.loadReviewSummary(id);
      return true;
    } catch {
      this.errorMessage.set('Не удалось сохранить ваш рейтинг.');
      return false;
    }
  }

  byStatus(status: MangaStatus): MangaEntry[] {
    const entries = this.readingListStatuses();

    return this.mangaLibrary().filter((item) => entries[item.id] === status);
  }

  private async loadUserState(): Promise<void> {
    if (!this.isAuthenticated()) {
      return;
    }

    try {
      const entries = await firstValueFrom(
        this.http.get<ReadingListEntryResponse[]>(`${DJANGO_API_BASE_PATH}/reading-list/`)
      );

      const nextStatuses: Record<string, MangaStatus> = {};
      const nextFavorites: string[] = [];

      for (const entry of entries) {
        const status = this.toUiStatus(entry.status);
        nextStatuses[entry.manga_external_id] = status;
        if (status === 'Plan to Read') {
          nextFavorites.push(entry.manga_external_id);
        }
      }

      this.readingListStatuses.set(nextStatuses);
      this.favoriteIds.set(nextFavorites);
      this.refreshDerivedLibrary();
    } catch {
      this.errorMessage.set('Не удалось загрузить пользовательские данные из backend.');
    }
  }

  private async loadReviewSummary(id: string): Promise<void> {
    if (!this.isAuthenticated()) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<ReviewSummaryResponse>(`${DJANGO_API_BASE_PATH}/manga/external/${id}/reviews/`)
      );

      this.reviewAverages.update((ratings) => ({
        ...ratings,
        [id]: response.average_score ?? 0
      }));

      if (response.user_review) {
        this.userRatings.update((ratings) => ({
          ...ratings,
          [id]: response.user_review!.score
        }));
      }
    } catch {
      // Ignore missing review summary for untouched titles.
    }
  }

  private async syncRemoteManga(id: string): Promise<boolean> {
    const syncPayload = this.buildSyncPayload(id);

    if (!syncPayload) {
      return false;
    }

    try {
      await firstValueFrom(
        this.http.post(`${DJANGO_API_BASE_PATH}/manga/sync/`, syncPayload)
      );
      return true;
    } catch {
      return false;
    }
  }

  private buildSyncPayload(id: string): {
    external_id: string;
    title: string;
    author: string;
    genres: string[];
    summary: string;
    status: string;
    chapters: number;
    published: string;
    cover_image: string;
  } | null {
    const libraryEntry = this.getMangaById(id);
    const detail = this.detailCache()[id];

    if (!libraryEntry && !detail) {
      return null;
    }

    return {
      external_id: id,
      title: detail?.name || libraryEntry?.title || 'Unknown title',
      author: detail?.author || libraryEntry?.author || 'Unknown author',
      genres: detail?.genres?.length ? detail.genres : libraryEntry?.genre ?? [],
      summary: detail?.description || libraryEntry?.synopsis || '',
      status: detail?.status || libraryEntry?.status || 'Ongoing',
      chapters: detail?.chapterList?.length || libraryEntry?.chapters || 0,
      published: detail?.year ? String(detail.year) : String(libraryEntry?.year ?? ''),
      cover_image: detail?.imageUrl || libraryEntry?.image || ''
    };
  }

  private applyAuthResponse(response: AuthResponse): void {
    const nextSession = {
      access: response.tokens.access,
      refresh: response.tokens.refresh,
      userName: response.user.username
    } satisfies AuthSession;

    this.authSession.set(nextSession);
    this.persistSession(nextSession);
  }

  private clearAuthState(): void {
    this.authSession.set(null);
    this.favoriteIds.set([]);
    this.userRatings.set({});
    this.reviewAverages.set({});
    this.readingListStatuses.set({});

    if (this.canUseStorage()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    this.refreshDerivedLibrary();
  }

  private restoreSession(): void {
    if (!this.canUseStorage()) {
      return;
    }

    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    try {
      const parsed = JSON.parse(rawValue) as AuthSession;
      if (parsed.access && parsed.refresh && parsed.userName) {
        this.authSession.set(parsed);
      }
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  private persistSession(session: AuthSession): void {
    if (!this.canUseStorage()) {
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  private canUseStorage(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  private refreshDerivedLibrary(): void {
    this.mangaLibrary.update((library) =>
      library.map((item, index) => ({
        ...item,
        status: this.readingListStatuses()[item.id] ?? this.deriveShelfStatus(undefined, index)
      }))
    );
  }

  private upsertMangaFromDetail(id: string, detail: MangaDetailResponse): void {
    const existing = this.getMangaById(id);
    const enrichedEntry = this.buildEntryFromDetail(id, detail, existing);

    this.mangaLibrary.update((library) => {
      const existingIndex = library.findIndex((item) => item.id === id);

      if (existingIndex === -1) {
        return [enrichedEntry, ...library];
      }

      const nextLibrary = [...library];
      nextLibrary[existingIndex] = { ...nextLibrary[existingIndex], ...enrichedEntry };
      return nextLibrary;
    });
  }

  private toMangaEntry(
    summary: MangaListResponse['mangaList'][number],
    detail: MangaDetailResponse | null,
    index: number
  ): MangaEntry {
    const genres = detail?.genres?.length ? detail.genres : this.fallbackGenres(summary);
    const popularitySource = detail?.view ?? summary.view;

    return {
      id: summary.id,
      title: detail?.name || summary.title,
      image: detail?.imageUrl || summary.image,
      genre: genres,
      year: detail?.year ?? this.extractYear(detail?.updated),
      popularity: this.parseViewCount(popularitySource),
      chapters: detail?.chapterList?.length || this.extractChapterCount(summary.chapter),
      status: this.readingListStatuses()[summary.id] ?? this.deriveShelfStatus(detail?.status, index),
      synopsis: detail?.description || summary.description || 'No description provided by MangaHook.',
      accent: ACCENT_ROTATION[index % ACCENT_ROTATION.length],
      author: detail?.author || 'Unknown author',
      updated: detail?.updated || 'Unknown update date',
      latestChapter: detail?.chapterList?.[0]?.name || summary.chapter
    };
  }

  private getOptionLabel(option: ApiFilterOption): string {
    return option.name ?? option.type ?? option.id;
  }

  private extractYear(updated?: string): number {
    const matchedYear = updated?.match(/\b(19|20)\d{2}\b/);
    return matchedYear ? Number(matchedYear[0]) : new Date().getFullYear();
  }

  private parseViewCount(view: string): number {
    const normalized = view.trim().toUpperCase().replace(/,/g, '');
    const match = normalized.match(/^([\d.]+)([KMB])?$/);

    if (!match) {
      return 0;
    }

    const value = Number(match[1]);
    const multiplier =
      match[2] === 'B' ? 1_000_000_000 : match[2] === 'M' ? 1_000_000 : match[2] === 'K' ? 1_000 : 1;
    return Math.round(value * multiplier);
  }

  private extractChapterCount(chapterLabel: string): number {
    const matchedChapter = chapterLabel.match(/(\d+(?:\.\d+)?)/);
    return matchedChapter ? Math.round(Number(matchedChapter[1])) : 0;
  }

  private fallbackGenres(summary: MangaListResponse['mangaList'][number]): string[] {
    const selectedGenre = this.selectedGenre();
    return selectedGenre === 'All Genres' ? ['Unknown'] : [selectedGenre];
  }

  private deriveShelfStatus(
    sourceStatus: string | undefined,
    index: number,
    existingStatus?: MangaStatus
  ): MangaStatus {
    if (existingStatus) {
      return existingStatus;
    }

    if (sourceStatus?.toLowerCase().includes('completed')) {
      return 'Completed';
    }

    return index % 2 === 0 ? 'Reading' : 'Plan to Read';
  }

  private buildEntryFromDetail(
    id: string,
    detail: MangaDetailResponse,
    existing?: MangaEntry | null
  ): MangaEntry {
    return {
      id,
      title: detail.name || existing?.title || 'Unknown title',
      image: detail.imageUrl || existing?.image || '',
      genre: detail.genres?.length ? detail.genres : existing?.genre ?? ['Unknown'],
      year: detail.year ?? existing?.year ?? this.extractYear(detail.updated),
      popularity: this.parseViewCount(detail.view || String(existing?.popularity ?? 0)),
      chapters: detail.chapterList?.length || existing?.chapters || 0,
      status: this.readingListStatuses()[id] ?? this.deriveShelfStatus(detail.status, 0, existing?.status),
      synopsis: detail.description || existing?.synopsis || 'No description provided by MangaHook.',
      accent: existing?.accent || ACCENT_ROTATION[0],
      author: detail.author || existing?.author || 'Unknown author',
      updated: detail.updated || existing?.updated || 'Unknown update date',
      latestChapter: detail.chapterList?.[0]?.name || existing?.latestChapter || 'No chapters yet'
    };
  }

  private toUiStatus(status: ReadingListStatus): MangaStatus {
    if (status === 'READING') {
      return 'Reading';
    }

    if (status === 'COMPLETED') {
      return 'Completed';
    }

    return 'Plan to Read';
  }
}
