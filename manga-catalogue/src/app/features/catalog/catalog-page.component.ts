import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MangaEntry } from '../../core/manga-data';
import { MangaStoreService } from '../../core/manga-store.service';

type SortMode = 'popularity' | 'newest' | 'alphabetical';
type ChapterBucket = 'any' | 'lt20' | 'lt50' | 'gte50' | 'gte100';

const INITIAL_LOAD_COUNT = 40;
const SUGGESTION_LIMIT = 10;

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="catalog-page">
      <header class="hero">
        <p class="eyebrow">Manga Hub</p>
        <h1>Каталог</h1>
        <p class="subcopy">Поиск работает по всему API, жанры можно комбинировать, лента грузится вниз автоматически.</p>
      </header>

      <section class="toolbar">
        <div class="row">
          @for (option of sortOptions; track option.id) {
            <button type="button" class="pill" [class.active]="selectedSort() === option.id" (click)="updateSort(option.id)">
              {{ option.label }}
            </button>
          }

          <button type="button" class="pill filter-btn" (click)="toggleFilterPanel()">Фильтры</button>
        </div>

        <div class="row">
          <button type="button" class="pill" [class.active]="isAllGenresActive()" (click)="clearGenres()">Все жанры</button>
          @for (genre of topGenreRail(); track genre) {
            <button type="button" class="pill" [class.active]="hasActiveGenre(genre)" (click)="toggleGenre(genre)">
              {{ genre }}
            </button>
          }
        </div>
      </section>

      <section class="layout">
        <main class="feed">
          <div class="stats">
            <div>
              <strong>{{ filteredManga().length }}</strong>
              <span>тайтлов найдено</span>
            </div>
            <div>
              <strong>{{ store.currentPage() }} / {{ store.totalPages() }}</strong>
              <span>{{ activeQuery() ? 'страниц поиска собрано' : 'страниц каталога собрано' }}</span>
            </div>
          </div>

          <section class="grid">
            @for (item of filteredManga(); track item.id) {
              <a class="card" [routerLink]="['/app/title', item.id]">
                <div class="poster">
                  <img [src]="item.image" [alt]="item.title" loading="lazy" />
                  <span class="badge">★ {{ ratingFor(item) }}</span>
                </div>
                <p class="meta">{{ item.year }} · {{ item.genre.join(', ') }}</p>
                <h3>{{ item.title }}</h3>
                <p class="copy">{{ item.synopsis }}</p>
              </a>
            } @empty {
              <article class="empty">
                <strong>Ничего не найдено</strong>
                <p>Попробуйте изменить поисковый запрос или фильтры справа.</p>
              </article>
            }
          </section>

          @if (filteredManga().length) {
            <div class="feed-state">
              @if (store.isLoading() && store.currentPage() > 1) {
                <p>Подгружаем еще карточки...</p>
              } @else if (store.hasMoreCatalogPages()) {
                <p>Листайте вниз, чтобы продолжить ленту.</p>
              } @else {
                <p>Вы долистали до конца текущей выдачи.</p>
              }
            </div>
          }
        </main>

        <aside class="sidebar" [class.open]="isFilterPanelOpen()">
          <section class="panel">
            <div class="panel-head">
              <h2>Поиск</h2>
              <button type="button" class="link" (click)="resetFilters()">Сбросить</button>
            </div>

            <label class="search">
              <input
                type="search"
                placeholder="Поиск по названию"
                [value]="searchQuery()"
                (focus)="isSearchFocused.set(true)"
                (blur)="hideSearchSuggestions()"
                (input)="updateSearch($event)"
              />
            </label>

            <p class="hint">Ищем по всем тайтлам API, а не только по тем, что уже были на странице.</p>

            @if (searchSuggestions().length) {
              <div class="suggestions">
                @for (item of searchSuggestions(); track item.id) {
                  <button type="button" class="suggestion" (mousedown)="applySuggestion(item.title)">
                    <span>{{ item.title }}</span>
                    <small>{{ item.genre.join(', ') }} · {{ item.year }}</small>
                  </button>
                }
              </div>
            }
          </section>

          <section class="panel">
            <div class="panel-head">
              <h2>Жанры</h2>
              <button type="button" class="link" (click)="clearGenres()">Сбросить</button>
            </div>

            <label class="search mini">
              <input
                type="search"
                placeholder='Поиск по "Жанры"'
                [value]="genreSearchQuery()"
                (input)="updateGenreSearch($event)"
              />
            </label>

            <div class="genre-list">
              @for (genre of sidebarGenres(); track genre) {
                <button type="button" class="genre-item" [class.active]="hasActiveGenre(genre)" (click)="toggleGenre(genre)">
                  <span class="check"></span>
                  <span>{{ genre }}</span>
                </button>
              }
            </div>
          </section>

          <section class="panel">
            <h2>Год</h2>
            <div class="chips">
              @for (year of yearOptions(); track year) {
                <button type="button" class="pill" [class.active]="selectedYear() === year" (click)="updateYear(year)">
                  {{ year }}
                </button>
              }
            </div>
          </section>

          <section class="panel">
            <h2>Статус</h2>
            <div class="chips">
              @for (status of statusOptions; track status) {
                <button type="button" class="pill" [class.active]="selectedStatus() === status" (click)="selectedStatus.set(status)">
                  {{ status }}
                </button>
              }
            </div>
          </section>

          <section class="panel">
            <h2>Количество глав</h2>
            <div class="chips">
              @for (bucket of chapterOptions; track bucket.id) {
                <button type="button" class="pill" [class.active]="selectedChapterBucket() === bucket.id" (click)="selectedChapterBucket.set(bucket.id)">
                  {{ bucket.label }}
                </button>
              }
            </div>
          </section>
        </aside>
      </section>
    </section>
  `,
  styles: [
    `
      .catalog-page { display:grid; gap:1.4rem; padding-bottom:2rem; }
      .hero, .toolbar, .feed, .sidebar { border:1px solid rgba(255,255,255,.07); background:rgba(18,20,25,.9); box-shadow:0 24px 56px rgba(0,0,0,.26); border-radius:28px; }
      .hero { display:grid; gap:.8rem; justify-items:center; text-align:center; padding:2rem 1rem .8rem; }
      .eyebrow, .meta, .copy, .hint, .stats span, .suggestion small { color:rgba(246,247,251,.58); }
      .eyebrow { margin:0; font-size:.82rem; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
      h1, h2, h3, p, strong, small { margin:0; }
      .hero h1 { font-size:clamp(3rem,5vw,4.2rem); line-height:.95; }
      .subcopy { max-width:46rem; color:rgba(246,247,251,.7); line-height:1.65; }
      .toolbar { display:grid; gap:.9rem; padding:1.2rem; }
      .row, .chips, .genre-list { display:flex; gap:.7rem; flex-wrap:wrap; }
      .pill, .genre-item, .suggestion { border:1px solid rgba(255,255,255,.08); border-radius:999px; background:rgba(255,255,255,.03); color:#f6f7fb; }
      .pill { min-height:2.9rem; padding:0 1rem; font-weight:700; }
      .pill.active, .genre-item.active { border-color:rgba(79,140,255,.32); background:rgba(79,140,255,.16); }
      .layout { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:1.2rem; align-items:start; }
      .feed { display:grid; gap:1.1rem; padding:1.2rem; }
      .stats { display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
      .stats strong { display:block; font-size:1.9rem; }
      .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(175px,1fr)); gap:1.15rem; }
      .card { color:inherit; text-decoration:none; }
      .poster { position:relative; overflow:hidden; aspect-ratio:.72; margin-bottom:.8rem; border-radius:22px; background:rgba(255,255,255,.04); }
      .poster img { width:100%; height:100%; object-fit:cover; transition:transform .22s ease; }
      .card:hover .poster img { transform:scale(1.03); }
      .poster::after { content:''; position:absolute; inset:auto 0 0; height:40%; background:linear-gradient(180deg,transparent,rgba(9,10,12,.8)); }
      .badge { position:absolute; right:.75rem; bottom:.75rem; z-index:1; padding:.42rem .7rem; border-radius:999px; background:rgba(255,255,255,.18); backdrop-filter:blur(12px); font-weight:800; }
      .card h3 { margin-top:.35rem; font-size:1.12rem; line-height:1.28; }
      .copy { margin-top:.45rem; line-height:1.55; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
      .empty, .panel { display:grid; gap:.75rem; padding:1rem; border-radius:22px; background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05); }
      .feed-state { display:flex; justify-content:center; }
      .feed-state p { padding:.9rem 1.2rem; border-radius:999px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06); color:rgba(246,247,251,.72); }
      .sidebar { position:sticky; top:6.4rem; display:grid; gap:1rem; padding:1rem; max-height:calc(100vh - 7.4rem); overflow:auto; }
      .panel-head { display:flex; align-items:center; justify-content:space-between; gap:.75rem; }
      .link { border:0; background:transparent; color:rgba(246,247,251,.68); font-weight:700; }
      .search input { width:100%; min-height:3.1rem; padding:0 1rem; border:1px solid rgba(255,255,255,.07); border-radius:16px; background:rgba(255,255,255,.03); color:#fff; }
      .mini input { min-height:2.9rem; }
      .search input::placeholder { color:rgba(246,247,251,.4); }
      .suggestions { display:grid; gap:.55rem; }
      .suggestion { display:grid; gap:.15rem; padding:.8rem .95rem; border-radius:16px; text-align:left; }
      .genre-list { display:grid; max-height:22rem; overflow:auto; padding-right:.2rem; }
      .genre-item { display:flex; align-items:center; gap:.75rem; min-height:3rem; padding:0 1rem; border-radius:18px; text-align:left; font-weight:700; }
      .check { width:1.05rem; height:1.05rem; border-radius:8px; border:1px solid rgba(79,140,255,.44); background:rgba(0,0,0,.12); }
      .genre-item.active .check { background:linear-gradient(180deg,rgba(79,140,255,.4),rgba(79,140,255,.18)); }
      @media (max-width:1180px) { .layout { grid-template-columns:1fr; } .sidebar { position:static; max-height:none; display:none; } .sidebar.open { display:grid; } }
      @media (max-width:720px) { .hero { justify-items:start; text-align:left; padding-top:1rem; } .grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogPageComponent implements OnInit, OnDestroy {
  readonly store = inject(MangaStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly sortOptions = [
    { id: 'popularity' as const, label: 'По популярности' },
    { id: 'newest' as const, label: 'Сначала новое' },
    { id: 'alphabetical' as const, label: 'По алфавиту' }
  ];
  readonly statusOptions = ['Все', 'Reading', 'Completed', 'Plan to Read'] as const;
  readonly chapterOptions = [
    { id: 'any' as const, label: 'Любое' },
    { id: 'lt20' as const, label: '<20' },
    { id: 'lt50' as const, label: '<50' },
    { id: 'gte50' as const, label: '50+' },
    { id: 'gte100' as const, label: '100+' }
  ];
  readonly themePresets = [
    { id: 'all' as const, genres: [] },
    { id: 'fantasy' as const, genres: ['Fantasy', 'Action', 'Adventure'] },
    { id: 'ladies' as const, genres: ['Romance', 'Drama', 'Slice of Life'] },
    { id: 'romance' as const, genres: ['Romance', 'Comedy'] },
    { id: 'dark' as const, genres: ['Psychological', 'Mystery', 'Horror'] }
  ];

  readonly selectedSort = signal<SortMode>('popularity');
  readonly selectedGenres = signal<string[]>([]);
  readonly selectedYear = signal('All Years');
  readonly selectedStatus = signal<(typeof this.statusOptions)[number]>('Все');
  readonly selectedChapterBucket = signal<ChapterBucket>('any');
  readonly selectedThemePreset = signal<'all' | 'fantasy' | 'ladies' | 'romance' | 'dark'>('all');
  readonly searchQuery = signal('');
  readonly genreSearchQuery = signal('');
  readonly isSearchFocused = signal(false);
  readonly isFilterPanelOpen = signal(true);

  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  readonly activeQuery = computed(() => this.searchQuery().trim());
  readonly yearOptions = computed(() => [
    'All Years',
    ...new Set(this.store.mangaLibrary().map((item) => item.year).sort((a, b) => b - a).map(String))
  ]);
  readonly topGenreRail = computed(() => {
    const loaded = this.store.genreOptions().filter((item) => item !== 'All Genres').slice(0, 7);
    return loaded.length ? loaded : this.collectGenres().slice(0, 7);
  });
  readonly sidebarGenres = computed(() => {
    const query = this.normalizeText(this.genreSearchQuery());
    const source = this.store.genreOptions().filter((item) => item !== 'All Genres');
    const genres = source.length ? source : this.collectGenres();
    return query ? genres.filter((genre) => this.normalizeText(genre).includes(query)) : genres;
  });
  readonly filteredManga = computed(() => {
    let result = [...this.store.mangaLibrary()];
    const activeGenres = this.selectedGenres();
    if (activeGenres.length) {
      result = result.filter((item) => activeGenres.every((genre) => item.genre.includes(genre)));
    }
    const preset = this.themePresets.find((item) => item.id === this.selectedThemePreset());
    if (preset && preset.id !== 'all') {
      result = result.filter((item) => item.genre.some((genre) => preset.genres.includes(genre)));
    }
    if (this.selectedYear() !== 'All Years') {
      result = result.filter((item) => item.year === Number(this.selectedYear()));
    }
    if (this.selectedStatus() !== 'Все') {
      result = result.filter((item) => item.status === this.selectedStatus());
    }
    if (this.selectedChapterBucket() !== 'any') {
      result = result.filter((item) => this.matchesChapterBucket(item, this.selectedChapterBucket()));
    }
    return result.sort((left, right) => {
      if (this.selectedSort() === 'alphabetical') return left.title.localeCompare(right.title);
      if (this.selectedSort() === 'newest') return right.year - left.year || right.popularity - left.popularity;
      return right.popularity - left.popularity;
    });
  });
  readonly searchSuggestions = computed(() => {
    const query = this.normalizeText(this.searchQuery());
    if (!this.isSearchFocused() || query.length < 2) return [];
    return [...this.store.mangaLibrary()]
      .map((item) => ({ item, score: this.suggestionScore(item.title, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || b.item.popularity - a.item.popularity)
      .slice(0, SUGGESTION_LIMIT)
      .map((entry) => entry.item);
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.searchQuery.set(params.get('query') ?? '');
      this.reloadFeed(true);
    });
  }

  ngOnDestroy(): void {
    if (this.searchDebounceHandle) clearTimeout(this.searchDebounceHandle);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.isBrowser) this.loadMoreIfNeeded();
  }

  updateSort(sort: SortMode): void { this.selectedSort.set(sort); }
  hasActiveGenre(genre: string): boolean { return this.selectedGenres().includes(genre); }
  isAllGenresActive(): boolean { return this.selectedGenres().length === 0; }

  toggleGenre(genre: string): void {
    const next = this.hasActiveGenre(genre)
      ? this.selectedGenres().filter((item) => item !== genre)
      : [...this.selectedGenres(), genre].sort((a, b) => a.localeCompare(b));
    this.selectedGenres.set(next);
    this.genreSearchQuery.set('');
    if (this.activeQuery()) this.scrollToTop(); else this.reloadFeed(true);
  }

  clearGenres(): void {
    if (!this.selectedGenres().length) return;
    this.selectedGenres.set([]);
    this.genreSearchQuery.set('');
    if (this.activeQuery()) this.scrollToTop(); else this.reloadFeed(true);
  }

  updateYear(year: string): void { this.selectedYear.set(year); this.scrollToTop(); }
  updateGenreSearch(event: Event): void { this.genreSearchQuery.set((event.target as HTMLInputElement).value); }

  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.scheduleSearchReload();
  }

  applySuggestion(title: string): void {
    this.searchQuery.set(title);
    this.isSearchFocused.set(false);
    this.reloadFeed(true);
  }

  hideSearchSuggestions(): void {
    if (!this.isBrowser) { this.isSearchFocused.set(false); return; }
    window.setTimeout(() => this.isSearchFocused.set(false), 120);
  }

  toggleFilterPanel(): void { this.isFilterPanelOpen.update((value) => !value); }

  resetFilters(): void {
    this.selectedSort.set('popularity');
    this.selectedGenres.set([]);
    this.selectedYear.set('All Years');
    this.selectedStatus.set('Все');
    this.selectedChapterBucket.set('any');
    this.selectedThemePreset.set('all');
    this.searchQuery.set('');
    this.genreSearchQuery.set('');
    this.isSearchFocused.set(false);
    this.reloadFeed(true);
  }

  ratingFor(item: MangaEntry): string {
    const score = Math.min(9.9, 6.2 + Math.log10(Math.max(item.popularity, 1)) * 0.62);
    return score.toFixed(1);
  }

  private scheduleSearchReload(): void {
    if (!this.isBrowser) { this.reloadFeed(true); return; }
    if (this.searchDebounceHandle) clearTimeout(this.searchDebounceHandle);
    this.searchDebounceHandle = window.setTimeout(() => this.reloadFeed(true), 350);
  }

  private reloadFeed(reset: boolean): void {
    const targetPage = Math.ceil(INITIAL_LOAD_COUNT / this.store.pageSize());
    this.store.loadCatalogPages({ query: this.activeQuery(), genres: this.selectedGenres(), targetPage, reset });
    this.scrollToTop();
  }

  private loadMoreIfNeeded(): void {
    if (this.store.isLoading() || !this.store.hasMoreCatalogPages()) return;
    const viewportBottom = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 420;
    if (viewportBottom < threshold) return;
    this.store.loadCatalogPages({ query: this.activeQuery(), genres: this.selectedGenres(), targetPage: this.store.currentPage() + 1 });
  }

  private scrollToTop(): void {
    if (this.isBrowser) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private collectGenres(): string[] {
    return [...new Set(this.store.mangaLibrary().flatMap((item) => item.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  private normalizeText(value: string): string {
    return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  private suggestionScore(title: string, query: string): number {
    const normalized = this.normalizeText(title);
    if (!normalized || !query) return 0;
    if (normalized === query) return 300;
    let score = 0;
    if (normalized.startsWith(query)) score += 180;
    if (normalized.includes(` ${query}`)) score += 80;
    if (normalized.includes(query)) score += 60;
    const overlap = query.split(' ').filter((token) => normalized.split(' ').some((word) => word.startsWith(token))).length;
    return score + overlap * 35 - Math.abs(normalized.length - query.length);
  }

  private matchesChapterBucket(item: MangaEntry, bucket: ChapterBucket): boolean {
    if (bucket === 'lt20') return item.chapters < 20;
    if (bucket === 'lt50') return item.chapters < 50;
    if (bucket === 'gte50') return item.chapters >= 50;
    if (bucket === 'gte100') return item.chapters >= 100;
    return true;
  }
}
