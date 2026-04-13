import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  FRIENDS_LIST,
  FriendEntry,
  MangaEntry,
  MangaStatus,
  PanelTone
} from './manga-data';
const API_BASE_PATH = '/api';
const ACCENT_ROTATION: readonly PanelTone[] = ['plum', 'indigo', 'sky', 'gold'];
const PAGE_SIZE = 12;

interface ApiGenre {
  name: string;
}

interface ApiManga {
  id: number;
  title: string;
  genres: ApiGenre[];
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS';
  summary: string;
  rating: number;
  chapters: number;
  published: string;
  author: string;
  created_at: string;
}

interface ApiReadingListItem {
  manga: string;
  status: 'PLANNED' | 'READING' | 'COMPLETED';
}

@Injectable({ providedIn: 'root' })
export class MangaStoreService {
  private readonly http = inject(HttpClient);
  readonly userName = signal('Mina Sato');

  readonly mangaLibrary = signal<MangaEntry[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly selectedGenre = signal('All Genres');
  readonly loadedOnce = signal(false);

  readonly friends = computed<FriendEntry[]>(() => {
    const library = this.mangaLibrary();

    return FRIENDS_LIST.map((friend, index) => ({
      ...friend,
      currentlyReading: library[index % Math.max(library.length, 1)]?.title ?? 'Updating shelf...'
    }));
  });

  readonly genreOptions = computed(() => {
    const categories = [
      ...new Set(this.mangaLibrary().flatMap((item) => item.genre).filter((genre) => genre !== 'Unknown'))
    ];
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

  setUserName(userName: string): void {
    if (userName.trim()) {
      this.userName.set(userName.trim());
    }
  }

  logout(): void {
    this.afterLogout();
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

    forkJoin({
      manga: this.http.get<ApiManga[]>(`${API_BASE_PATH}/manga/`),
      readingList: this.http
        .get<ApiReadingListItem[]>(`${API_BASE_PATH}/reading-list/`)
        .pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ manga, readingList }) => {
        const allEntries = manga.map((item, index) => this.toMangaEntry(item, index, readingList));
        const genreFiltered =
          genre === 'All Genres'
            ? allEntries
            : allEntries.filter((item) => item.genre.includes(genre));
        const totalPages = Math.max(1, Math.ceil(genreFiltered.length / PAGE_SIZE));
        const normalizedPage = Math.min(Math.max(page, 1), totalPages);
        const start = (normalizedPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;

        this.mangaLibrary.set(genreFiltered.slice(start, end));
        this.totalPages.set(totalPages);
        this.currentPage.set(normalizedPage);
        this.loadedOnce.set(true);
        this.isLoading.set(false);
      },
      error: () => {
        this.mangaLibrary.set([]);
        this.totalPages.set(1);
        this.loadedOnce.set(true);
        this.isLoading.set(false);
        this.errorMessage.set(
          'Django API could not be reached. Start backend and check /api/manga and /api/reading-list.'
        );
      }
    });
  }

  byStatus(status: MangaStatus): MangaEntry[] {
    return this.mangaLibrary().filter((item) => item.status === status);
  }

  private toMangaEntry(item: ApiManga, index: number, readingList: ApiReadingListItem[]): MangaEntry {
    const readingListStatus = readingList.find((entry) => entry.manga === item.title)?.status;
    const genres = item.genres.length ? item.genres.map((genre) => genre.name) : ['Unknown'];
    return {
      id: String(item.id),
      title: item.title,
      image: '',
      genre: genres,
      year: this.extractYear(item.published || item.created_at),
      popularity: this.parseRatingToPopularity(item.rating),
      chapters: item.chapters,
      status: this.mapReadingStatus(readingListStatus, item.status, index),
      synopsis: item.summary || 'No description provided yet.',
      accent: ACCENT_ROTATION[index % ACCENT_ROTATION.length],
      author: item.author || 'Unknown author',
      updated: item.published || item.created_at || 'Unknown update date',
      latestChapter: `Chapter ${item.chapters}`
    };
  }

  private extractYear(updated?: string): number {
    const matchedYear = updated?.match(/\b(19|20)\d{2}\b/);
    return matchedYear ? Number(matchedYear[0]) : new Date().getFullYear();
  }

  private parseRatingToPopularity(rating: number): number {
    return Math.round(Math.max(rating, 0) * 1000);
  }

  private mapReadingStatus(
    readingStatus: ApiReadingListItem['status'] | undefined,
    mangaStatus: ApiManga['status'],
    index: number
  ): MangaStatus {
    if (readingStatus === 'COMPLETED' || mangaStatus === 'COMPLETED') {
      return 'Completed';
    }

    if (readingStatus === 'READING') {
      return 'Reading';
    }

    if (readingStatus === 'PLANNED') {
      return 'Plan to Read';
    }

    return index % 2 === 0 ? 'Reading' : 'Plan to Read';
  }

  private afterLogout(): void {
    this.mangaLibrary.set([]);
    this.currentPage.set(1);
    this.totalPages.set(1);
    this.selectedGenre.set('All Genres');
    this.loadedOnce.set(false);
  }
}
