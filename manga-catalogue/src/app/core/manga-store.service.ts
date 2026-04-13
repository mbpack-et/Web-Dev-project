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

  readonly isAuthenticated = signal(false);
  readonly userName = signal('Mina Sato');

  readonly mangaLibrary = signal<MangaEntry[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly selectedGenre = signal('All Genres');
  readonly loadedOnce = signal(false);

  private readonly availableCategoryOptions = signal<ApiFilterOption[]>([]);

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
  }

  ensureCatalogLoaded(): void {
    if (this.isLoading() || this.loadedOnce()) {
      return;
    }

    this.loadCatalog();
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

          const detailRequests = response.mangaList.map((item, index) =>
            this.http
              .get<MangaDetailResponse>(`${API_BASE_PATH}/manga/${item.id}`)
              .pipe(
                catchError(() =>
                  of({
                    imageUrl: item.image,
                    name: item.title,
                    author: 'Unknown author',
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

  byStatus(status: MangaStatus): MangaEntry[] {
    return this.mangaLibrary().filter((item) => item.status === status);
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
      year: this.extractYear(detail?.updated),
      popularity: this.parseViewCount(popularitySource),
      chapters: detail?.chapterList?.length || this.extractChapterCount(summary.chapter),
      status: this.deriveShelfStatus(detail?.status, index),
      synopsis: summary.description || 'No description provided by MangaHook.',
      accent: ACCENT_ROTATION[index % ACCENT_ROTATION.length],
      author: detail?.author || 'Unknown author',
      updated: detail?.updated || 'Unknown update date',
      latestChapter: summary.chapter
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
    const multiplier = match[2] === 'B' ? 1_000_000_000 : match[2] === 'M' ? 1_000_000 : match[2] === 'K' ? 1_000 : 1;
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

  private deriveShelfStatus(sourceStatus: string | undefined, index: number): MangaStatus {
    if (sourceStatus?.toLowerCase().includes('completed')) {
      return 'Completed';
    }

    return index % 2 === 0 ? 'Reading' : 'Plan to Read';
  }
}
