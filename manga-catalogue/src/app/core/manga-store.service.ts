import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { firstValueFrom, forkJoin, of } from 'rxjs';

import {
  ApiFilterOption,
  FRIENDS_LIST,
  FriendEntry,
  MangaDetailResponse,
  MangaEntry,
  MangaListResponse,
  MangaStatus,
  PanelTone
} from './manga-data';

const API_BASE_PATH = '/api/mangahook';
const ACCENT_ROTATION: readonly PanelTone[] = ['plum', 'indigo', 'sky', 'gold'];
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_SUGGESTION_LIMIT = 10;
const SEARCH_SUGGESTION_MAX_PAGES = 4;

interface FeedLoadOptions {
  genres?: string[];
  query?: string;
  targetPage?: number;
  reset?: boolean;
}

interface FeedStreamState {
  page: number;
  totalPages: number;
}

interface FeedStreamDescriptor {
  key: string;
  query?: string;
  genre?: string;
}

@Injectable({ providedIn: 'root' })
export class MangaStoreService {
  private readonly http = inject(HttpClient);
  private readonly pendingDetailIds = new Set<string>();

  readonly isAuthenticated = signal(false);
  readonly userName = signal('Mina Sato');

  readonly mangaLibrary = signal<MangaEntry[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(0);
  readonly totalPages = signal(1);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly selectedGenre = signal('All Genres');
  readonly loadedOnce = signal(false);
  readonly favoriteIds = signal<string[]>([]);
  readonly userRatings = signal<Record<string, number>>({});
  readonly activeSearchQuery = signal('');
  readonly searchSuggestions = signal<MangaEntry[]>([]);

  private readonly activeGenreFilters = signal<string[]>([]);
  private readonly availableCategoryOptions = signal<ApiFilterOption[]>([]);
  private readonly detailCache = signal<Record<string, MangaDetailResponse>>({});
  private readonly streamStates = signal<Record<string, FeedStreamState>>({});
  private readonly activeSourceKey = signal('');
  private searchSuggestionRequestId = 0;

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
    const readingSeries = this.mangaLibrary().filter((item) => item.status === 'Reading');
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

  readonly hasMoreCatalogPages = computed(() =>
    Object.values(this.streamStates()).some((state) => state.page < state.totalPages)
  );

  login(userName: string, password: string): boolean {
    if (!userName.trim() || !password.trim()) {
      return false;
    }

    this.userName.set(userName.trim());
    this.isAuthenticated.set(true);
    return true;
  }

  register(username: string, email: string, password: string): Promise<boolean> {
    if (!username.trim() || !email.trim() || !password.trim()) {
      return Promise.resolve(false);
    }

    const body = { username: username.trim(), email: email.trim(), password };

    return this.http
      .post<{ id: number; username: string; email: string }>('/api/auth/register/', body)
      .toPromise()
      .then((response) => {
        if (response) {
          this.userName.set(response.username);
          this.isAuthenticated.set(true);
          return true;
        }

        return false;
      })
      .catch(() => false);
  }

  logout(): void {
    this.isAuthenticated.set(false);
    this.favoriteIds.set([]);
    this.userRatings.set({});
  }

  ensureCatalogLoaded(): void {
    if (this.isLoading() || this.loadedOnce()) {
      return;
    }

    this.loadCatalogPages({ targetPage: 1, reset: true });
  }

  ensureMangaDetail(id: string): void {
    if (!id || this.detailCache()[id] || this.pendingDetailIds.has(id)) {
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
      });
  }

  loadSearchSuggestions(query: string, genres?: string[]): void {
    const normalizedQuery = this.normalizeQuery(query);
    const normalizedGenres = this.normalizeGenres(genres);
    const requestId = ++this.searchSuggestionRequestId;

    if (normalizedQuery.length < 2) {
      this.searchSuggestions.set([]);
      return;
    }

    void this.fetchSearchSuggestions(requestId, normalizedQuery, normalizedGenres);
  }

  loadCatalogPages(options?: FeedLoadOptions): void {
    const normalizedGenres = this.normalizeGenres(options?.genres);
    const normalizedQuery = this.normalizeQuery(options?.query);
    const targetPage = Math.max(1, options?.targetPage ?? 1);
    const sourceKey = this.buildSourceKey(normalizedQuery, normalizedGenres);
    const shouldReset =
      Boolean(options?.reset) ||
      sourceKey !== this.activeSourceKey() ||
      targetPage < this.currentPage();

    if (this.isLoading()) {
      return;
    }

    if (!shouldReset && !this.needsAdditionalPages(normalizedQuery, normalizedGenres, targetPage)) {
      return;
    }

    void this.fetchCatalogFeed({
      query: normalizedQuery,
      genres: normalizedGenres,
      targetPage,
      reset: shouldReset
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

  isFavorite(id: string): boolean {
    return this.favoriteIds().includes(id);
  }

  getUserRating(id: string): number {
    return this.userRatings()[id] ?? 0;
  }

  toggleFavorite(id: string): boolean {
    if (!this.isAuthenticated()) {
      return false;
    }

    this.favoriteIds.update((ids) =>
      ids.includes(id) ? ids.filter((currentId) => currentId !== id) : [...ids, id]
    );

    return true;
  }

  setUserRating(id: string, rating: number): boolean {
    if (!this.isAuthenticated()) {
      return false;
    }

    this.userRatings.update((ratings) => ({ ...ratings, [id]: rating }));
    return true;
  }

  byStatus(status: MangaStatus): MangaEntry[] {
    return this.mangaLibrary().filter((item) => item.status === status);
  }

  private async fetchCatalogFeed(options: Required<FeedLoadOptions>): Promise<void> {
    const sourceKey = this.buildSourceKey(options.query, options.genres);
    const descriptors = this.buildStreamDescriptors(options.query, options.genres);
    const nextLibrary = options.reset ? [] : [...this.mangaLibrary()];
    const nextDetailCache = options.reset ? {} : { ...this.detailCache() };
    const nextStreamStates = options.reset ? {} : { ...this.streamStates() };
    const desiredMatchCount = Math.max(DEFAULT_PAGE_SIZE, options.targetPage * DEFAULT_PAGE_SIZE);

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.activeSourceKey.set(sourceKey);
    this.activeSearchQuery.set(options.query);
    this.activeGenreFilters.set(options.genres);
    this.selectedGenre.set(options.genres[0] ?? 'All Genres');

    if (options.reset) {
      this.currentPage.set(0);
      this.totalPages.set(1);
      this.pageSize.set(DEFAULT_PAGE_SIZE);
    }

    try {
      for (const descriptor of descriptors) {
        const currentState = nextStreamStates[descriptor.key] ?? {
          page: 0,
          totalPages: Number.POSITIVE_INFINITY
        };

        while (currentState.page < options.targetPage && currentState.page < currentState.totalPages) {
          await this.appendSourcePage(descriptor, nextLibrary, nextDetailCache, nextStreamStates, options.query);
        }
      }

      while (
        options.genres.length > 0 &&
        this.countGenreMatches(nextLibrary, options.genres) < desiredMatchCount
      ) {
        const loadableDescriptors = descriptors.filter((descriptor) => {
          const state = nextStreamStates[descriptor.key];
          return state && state.page < state.totalPages;
        });

        if (!loadableDescriptors.length) {
          break;
        }

        for (const descriptor of loadableDescriptors) {
          await this.appendSourcePage(descriptor, nextLibrary, nextDetailCache, nextStreamStates, options.query);

          if (this.countGenreMatches(nextLibrary, options.genres) >= desiredMatchCount) {
            break;
          }
        }
      }

      this.mangaLibrary.set(nextLibrary);
      this.detailCache.set(nextDetailCache);
      this.streamStates.set(nextStreamStates);
      this.syncProgressFromStates(nextStreamStates);
      this.loadedOnce.set(true);

      if (!nextLibrary.length) {
        this.currentPage.set(1);
      }
    } catch {
      if (options.reset) {
        this.mangaLibrary.set([]);
        this.detailCache.set({});
        this.streamStates.set({});
        this.currentPage.set(1);
        this.totalPages.set(1);
      }

      this.loadedOnce.set(true);
      this.errorMessage.set(
        'MangaHook could not be reached. Start the backend on http://localhost:3000 or update the proxy target.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private async fetchSearchSuggestions(
    requestId: number,
    query: string,
    genres: string[]
  ): Promise<void> {
    const suggestions: MangaEntry[] = [];
    const seenIds = new Set<string>();
    const descriptor: FeedStreamDescriptor = { key: `search:${query}`, query };

    try {
      let page = 1;
      let totalPages = 1;

      while (
        page <= totalPages &&
        page <= SEARCH_SUGGESTION_MAX_PAGES &&
        suggestions.length < SEARCH_SUGGESTION_LIMIT
      ) {
        const response = await firstValueFrom(this.requestSourcePage(descriptor, page));
        totalPages = response.metaData.totalPages ?? page;
        const details = await this.fetchPageDetails(response.mangaList, null);

        for (let index = 0; index < response.mangaList.length; index += 1) {
          const entry = this.toMangaEntry(response.mangaList[index], details[index] ?? null, index);

          if (seenIds.has(entry.id)) {
            continue;
          }

          if (genres.length && !genres.every((genre) => entry.genre.includes(genre))) {
            continue;
          }

          seenIds.add(entry.id);
          suggestions.push(entry);

          if (suggestions.length >= SEARCH_SUGGESTION_LIMIT) {
            break;
          }
        }

        page += 1;
      }
    } catch {
      if (requestId === this.searchSuggestionRequestId) {
        this.searchSuggestions.set([]);
      }
      return;
    }

    if (requestId === this.searchSuggestionRequestId) {
      this.searchSuggestions.set(suggestions);
    }
  }

  private needsAdditionalPages(query: string, genres: string[], targetPage: number): boolean {
    const descriptors = this.buildStreamDescriptors(query, genres);
    const states = this.streamStates();

    return descriptors.some((descriptor) => {
      const state = states[descriptor.key];

      if (!state) {
        return true;
      }

      return state.page < targetPage && state.page < state.totalPages;
    });
  }

  private buildStreamDescriptors(query: string, genres: string[]): FeedStreamDescriptor[] {
    if (query) {
      return [{ key: `search:${query}`, query }];
    }

    if (!genres.length) {
      return [{ key: 'genre:all', genre: undefined }];
    }

    return genres.map((genre) => ({ key: `genre:${genre}`, genre }));
  }

  private requestSourcePage(descriptor: FeedStreamDescriptor, page: number) {
    if (descriptor.query) {
      const params = new HttpParams().set('page', String(page));
      return this.http.get<MangaListResponse>(
        `${API_BASE_PATH}/search/${encodeURIComponent(descriptor.query)}`,
        { params }
      );
    }

    let params = new HttpParams().set('page', String(page));

    if (descriptor.genre) {
      params = params.set('category', descriptor.genre);
    }

    return this.http.get<MangaListResponse>(`${API_BASE_PATH}/mangaList`, { params });
  }

  private async appendSourcePage(
    descriptor: FeedStreamDescriptor,
    nextLibrary: MangaEntry[],
    nextDetailCache: Record<string, MangaDetailResponse>,
    nextStreamStates: Record<string, FeedStreamState>,
    activeQuery: string
  ): Promise<void> {
    const currentState = nextStreamStates[descriptor.key] ?? {
      page: 0,
      totalPages: Number.POSITIVE_INFINITY
    };
    const pageToLoad = currentState.page + 1;
    const response = await firstValueFrom(this.requestSourcePage(descriptor, pageToLoad));

    currentState.page = pageToLoad;
    currentState.totalPages = response.metaData.totalPages ?? pageToLoad;
    nextStreamStates[descriptor.key] = currentState;

    if (!activeQuery) {
      this.availableCategoryOptions.set(response.metaData.category ?? this.availableCategoryOptions());
    }

    if (response.mangaList.length) {
      this.pageSize.set(response.mangaList.length);
    }

    const details = await this.fetchPageDetails(response.mangaList, descriptor.genre ?? null);

    for (let index = 0; index < response.mangaList.length; index += 1) {
      const detail = details[index];

      if (detail) {
        nextDetailCache[response.mangaList[index].id] = detail;
      }
    }

    const pageEntries = response.mangaList.map((item, index) =>
      this.toMangaEntry(item, details[index] ?? null, nextLibrary.length + index)
    );

    this.mergeCatalogPage(nextLibrary, pageEntries);
  }

  private fetchPageDetails(
    mangaList: MangaListResponse['mangaList'],
    fallbackGenre: string | null
  ): Promise<Array<MangaDetailResponse | null>> {
    if (!mangaList.length) {
      return Promise.resolve([]);
    }

    const detailRequests = mangaList.map((item) =>
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
            genres: fallbackGenre ? [fallbackGenre] : [],
            chapterList: []
          } satisfies MangaDetailResponse)
        ),
        catchError(() => of(null))
      )
    );

    return firstValueFrom(forkJoin(detailRequests));
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
    const genres = detail?.genres?.length ? detail.genres : this.fallbackGenres();
    const popularitySource = detail?.view ?? summary.view ?? '0';

    return {
      id: summary.id,
      title: detail?.name || summary.title,
      image: detail?.imageUrl || summary.image,
      genre: genres,
      year: detail?.year ?? this.extractYear(detail?.updated),
      popularity: this.parseViewCount(popularitySource),
      chapters: detail?.chapterList?.length || this.extractChapterCount(summary.chapter ?? ''),
      status: this.deriveShelfStatus(detail?.status, index),
      synopsis: detail?.description || summary.description || 'No description provided by MangaHook.',
      accent: ACCENT_ROTATION[index % ACCENT_ROTATION.length],
      author: detail?.author || 'Unknown author',
      updated: detail?.updated || 'Unknown update date',
      latestChapter: detail?.chapterList?.[0]?.name || summary.chapter || 'No chapters yet'
    };
  }

  private syncProgressFromStates(states: Record<string, FeedStreamState>): void {
    const values = Object.values(states);

    if (!values.length) {
      this.currentPage.set(1);
      this.totalPages.set(1);
      return;
    }

    this.currentPage.set(Math.max(...values.map((state) => state.page)));
    this.totalPages.set(Math.max(...values.map((state) => state.totalPages)));
  }

  private mergeCatalogPage(existingEntries: MangaEntry[], nextEntries: MangaEntry[]): void {
    const libraryById = new Map(existingEntries.map((item) => [item.id, item]));

    for (const entry of nextEntries) {
      libraryById.set(entry.id, entry);
    }

    existingEntries.splice(0, existingEntries.length, ...Array.from(libraryById.values()));
  }

  private countGenreMatches(entries: MangaEntry[], genres: string[]): number {
    if (!genres.length) {
      return entries.length;
    }

    return entries.filter((entry) => genres.every((genre) => entry.genre.includes(genre))).length;
  }

  private buildSourceKey(query: string, genres: string[]): string {
    if (query) {
      return `search:${query}`;
    }

    return genres.length ? `genres:${genres.join('|')}` : 'genres:all';
  }

  private normalizeGenres(genres?: string[]): string[] {
    return [...new Set((genres ?? []).filter((genre) => genre && genre !== 'All Genres'))].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  private normalizeQuery(query?: string): string {
    return query?.trim() ?? '';
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

  private fallbackGenres(): string[] {
    const selectedGenres = this.activeGenreFilters();

    if (selectedGenres.length) {
      return selectedGenres;
    }

    return ['Unknown'];
  }

  private deriveShelfStatus(
    sourceStatus: string | undefined,
    index: number,
    existingStatus?: MangaStatus
  ): MangaStatus {
    if (sourceStatus?.toLowerCase().includes('completed')) {
      return 'Completed';
    }

    if (existingStatus) {
      return existingStatus;
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
      status: this.deriveShelfStatus(detail.status, 0, existing?.status),
      synopsis: detail.description || existing?.synopsis || 'No description provided by MangaHook.',
      accent: existing?.accent || ACCENT_ROTATION[0],
      author: detail.author || existing?.author || 'Unknown author',
      updated: detail.updated || existing?.updated || 'Unknown update date',
      latestChapter: detail.chapterList?.[0]?.name || existing?.latestChapter || 'No chapters yet'
    };
  }
}
