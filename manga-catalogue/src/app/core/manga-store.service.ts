import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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

@Injectable({ providedIn: 'root' })
export class MangaStoreService {
  private readonly http = inject(HttpClient);
  private readonly pendingDetailIds = new Set<string>();

  readonly isAuthenticated = signal(false);
  readonly userName = signal('Mina Sato');

  readonly mangaLibrary = signal<MangaEntry[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly selectedGenre = signal('All Genres');
  readonly loadedOnce = signal(false);
  readonly favoriteIds = signal<string[]>([]);
  readonly userRatings = signal<Record<string, number>>({});

  private readonly availableCategoryOptions = signal<ApiFilterOption[]>([]);
  private readonly detailCache = signal<Record<string, MangaDetailResponse>>({});

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

  login(userName: string, password: string): boolean {
    if (!userName.trim() || !password.trim()) {
      return false;
    }

    this.userName.set(userName.trim());
    this.isAuthenticated.set(true);
    return true;
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

    this.loadCatalog();
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
      status: this.deriveShelfStatus(detail?.status, index),
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
