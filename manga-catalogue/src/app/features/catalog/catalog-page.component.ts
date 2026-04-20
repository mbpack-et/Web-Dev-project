import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MangaEntry } from '../../core/manga-data';
import { MangaStoreService } from '../../core/manga-store.service';
import { SegmentedControlComponent } from '../../shared/segmented-control.component';

type SortMode = 'Popularity' | 'Alphabetical';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [RouterLink, SegmentedControlComponent],
  template: `
    <section class="catalog-page">
      <header class="catalog-hero">
        <div class="hero-copy">
          <p class="eyebrow">Каталог</p>
          <h1>Все тайтлы в одном потоке</h1>
          <p class="subcopy">
            Темная витрина с карточками, рейтингами, фильтрами по жанру и году и быстрым
            переключением между самыми популярными сериями.
          </p>
        </div>

        @if (featuredItem(); as featured) {
          <a class="featured-card" [routerLink]="['/app/title', featured.id]">
            <img [src]="featured.image" [alt]="featured.title" loading="lazy" />
            <div class="featured-copy">
              <p>{{ featured.year }} · {{ firstGenre(featured) }}</p>
              <h2>{{ featured.title }}</h2>
              <span>&#9733; {{ ratingFor(featured) }} · {{ compactViews(featured) }} просмотров</span>
            </div>
          </a>
        }
      </header>

      <section class="toolbar-shell">
        <div class="search-bar">
          <input type="text" placeholder="Search by manga name..." [value]="searchQuery()" (input)="updateSearch($event)" />
        </div>
        <div class="filter-stack">
          <app-segmented-control
            label="Жанр"
            [options]="genreOptions()"
            [selected]="selectedGenre()"
            (selectionChange)="updateGenre($event)"
          />

          <app-segmented-control
            label="Год"
            [options]="yearOptions()"
            [selected]="selectedYear()"
            (selectionChange)="selectedYear.set($event)"
          />

          <app-segmented-control
            label="Сортировка"
            [options]="sortOptions"
            [selected]="selectedSort()"
            (selectionChange)="updateSort($event)"
          />
        </div>

        <div class="pagination-bar">
          <div class="catalog-stats">
            <strong>{{ filteredManga().length }}</strong>
            <span>тайтлов на странице</span>
          </div>

          <div class="pager-actions">
            <button type="button" (click)="previousPage()" [disabled]="store.currentPage() === 1">
              Назад
            </button>
            <span>Страница {{ store.currentPage() }} / {{ store.totalPages() }}</span>
            <button type="button" (click)="nextPage()" [disabled]="store.currentPage() >= store.totalPages()">
              Вперёд
            </button>
          </div>
        </div>
      </section>

      <section class="catalog-grid">
        @for (item of filteredManga(); track item.id) {
          <a class="catalog-card" [routerLink]="['/app/title', item.id]">
            <div class="poster-frame">
              <img [src]="item.image" [alt]="item.title" loading="lazy" />
              <span class="rating-badge">&#9733; {{ ratingFor(item) }}</span>
            </div>
            <p class="card-meta">{{ item.year }} · {{ firstGenre(item) }}</p>
            <h3>{{ item.title }}</h3>
            <p class="card-copy">{{ item.synopsis }}</p>
          </a>
        } @empty {
          <article class="empty-catalog">
            <strong>По этим фильтрам ничего не найдено</strong>
            <p>Смените жанр, год или дождитесь, пока MangaHook обновит текущую страницу.</p>
          </article>
        }
      </section>
    </section>
  `,
  styles: [
    `
<<<<<<< Updated upstream
      .catalog-page {
        display: grid;
        gap: 1.3rem;
      }

      .catalog-hero,
      .toolbar-shell,
      .empty-catalog {
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(18, 20, 25, 0.9);
        box-shadow: 0 24px 56px rgba(0, 0, 0, 0.28);
      }

      .catalog-hero {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(260px, 360px);
        gap: 1.25rem;
        padding: 1.35rem;
        border-radius: 30px;
      }

      .eyebrow {
        margin: 0;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(246, 247, 251, 0.56);
      }

      .hero-copy {
        display: grid;
        align-content: center;
        gap: 0.8rem;
      }

      .hero-copy h1,
      .featured-copy h2,
      .catalog-card h3,
      .empty-catalog strong,
      .empty-catalog p {
        margin: 0;
      }

      .hero-copy h1 {
        font-size: clamp(2.2rem, 4vw, 3.8rem);
        line-height: 0.96;
      }

      .subcopy {
        max-width: 42rem;
        line-height: 1.6;
        color: rgba(246, 247, 251, 0.72);
      }

      .featured-card {
        position: relative;
        overflow: hidden;
        min-height: 20rem;
        border-radius: 24px;
        color: inherit;
        text-decoration: none;
      }

      .featured-card img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .featured-card::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent, rgba(10, 11, 14, 0.86));
      }

      .featured-copy {
        position: absolute;
        left: 1rem;
        right: 1rem;
        bottom: 1rem;
        z-index: 1;
        display: grid;
        gap: 0.3rem;
      }

      .featured-copy p,
      .featured-copy span,
      .card-meta,
      .card-copy {
        margin: 0;
        color: rgba(246, 247, 251, 0.64);
      }

      .featured-copy h2 {
        font-size: 1.45rem;
      }

      .toolbar-shell {
        display: grid;
        gap: 1rem;
        padding: 1.2rem;
        border-radius: 26px;
      }

      .search-bar input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.04);
        color: #ffffff;
        font-size: 1rem;
      }

      .search-bar input::placeholder {
        color: rgba(246, 247, 251, 0.56);
      }

      .filter-stack {
        display: grid;
        gap: 1rem;
      }

      .pagination-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        padding-top: 0.35rem;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }

      .catalog-stats strong {
        display: block;
        font-size: 2rem;
      }

      .catalog-stats span,
      .pager-actions span {
        color: rgba(246, 247, 251, 0.58);
      }

      .pager-actions {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        flex-wrap: wrap;
      }

      .pager-actions button {
        min-height: 2.85rem;
        padding: 0 1rem;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.04);
        color: #ffffff;
        font-weight: 700;
      }

      .pager-actions button:disabled {
        opacity: 0.38;
        cursor: not-allowed;
      }

      .catalog-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1.1rem;
      }

      .catalog-card {
        min-width: 0;
        color: inherit;
        text-decoration: none;
      }

      .poster-frame {
        position: relative;
        overflow: hidden;
        aspect-ratio: 0.72;
        margin-bottom: 0.8rem;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.04);
      }

      .poster-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 220ms ease;
      }

      .catalog-card:hover .poster-frame img {
        transform: scale(1.03);
      }

      .poster-frame::after {
        content: '';
        position: absolute;
        inset: auto 0 0;
        height: 40%;
        background: linear-gradient(180deg, transparent, rgba(9, 10, 12, 0.78));
      }

      .rating-badge {
        position: absolute;
        right: 0.75rem;
        bottom: 0.75rem;
        z-index: 1;
        padding: 0.45rem 0.7rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
        backdrop-filter: blur(10px);
        font-size: 0.92rem;
        font-weight: 800;
      }

      .catalog-card h3 {
        font-family: 'Manrope', sans-serif;
        font-size: 1.08rem;
        line-height: 1.3;
      }

      .card-copy {
        margin-top: 0.45rem;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.55;
      }

      .empty-catalog {
        grid-column: 1 / -1;
        padding: 1.4rem;
        border-radius: 24px;
      }

      @media (max-width: 840px) {
        .catalog-hero {
          grid-template-columns: 1fr;
        }
      }
=======
      .catalog-page { display:grid; gap:1.4rem; padding-bottom:2rem; }
      .hero, .toolbar, .feed, .sidebar { border:1px solid var(--panel-border); background:var(--surface); box-shadow:var(--poster-shadow); border-radius:28px; }
      .hero { display:grid; gap:.8rem; justify-items:center; text-align:center; padding:2rem 1rem .8rem; }
      .eyebrow, .meta, .copy, .hint, .stats span, .suggestion small { color:var(--text-muted); }
      .eyebrow { margin:0; font-size:.82rem; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
      h1, h2, h3, p, strong, small { margin:0; }
      .hero h1 { font-size:clamp(3rem,5vw,4.2rem); line-height:.95; }
      .subcopy { max-width:46rem; color:var(--text-soft); line-height:1.65; }
      .toolbar { display:grid; gap:.9rem; padding:1.2rem; }
      .row, .chips, .genre-list { display:flex; gap:.7rem; flex-wrap:wrap; }
      .pill, .genre-item, .suggestion { border:1px solid var(--panel-border); border-radius:999px; background:var(--chip-bg); color:var(--text-main); }
      .pill { min-height:2.9rem; padding:0 1rem; font-weight:700; }
      .pill.active, .genre-item.active { border-color:var(--accent-soft); background:var(--chip-active); }
      .layout { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:1.2rem; align-items:start; }
      .feed { display:grid; gap:1.1rem; padding:1.2rem; }
      .stats { display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
      .stats strong { display:block; font-size:1.9rem; }
      .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(175px,1fr)); gap:1.15rem; }
      .card { color:inherit; text-decoration:none; }
      .poster { position:relative; overflow:hidden; aspect-ratio:.72; margin-bottom:.8rem; border-radius:22px; background:var(--field-bg); }
      .poster img { width:100%; height:100%; object-fit:cover; transition:transform .22s ease; }
      .card:hover .poster img { transform:scale(1.03); }
      .poster::after { content:''; position:absolute; inset:auto 0 0; height:40%; background:var(--card-overlay); }
      .badge { position:absolute; right:.75rem; bottom:.75rem; z-index:1; padding:.42rem .7rem; border-radius:999px; background:var(--hero-overlay); backdrop-filter:blur(12px); font-weight:800; }
      .card h3 { margin-top:.35rem; font-size:1.12rem; line-height:1.28; }
      .copy { margin-top:.45rem; line-height:1.55; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
      .empty, .panel { display:grid; gap:.75rem; padding:1rem; border-radius:22px; background:var(--chip-bg); border:1px solid var(--panel-border); }
      .feed-state { display:flex; justify-content:center; }
      .feed-state p { padding:.9rem 1.2rem; border-radius:999px; background:var(--chip-bg); border:1px solid var(--panel-border); color:var(--text-soft); }
      .sidebar { position:sticky; top:6.4rem; display:grid; gap:1rem; padding:1rem; max-height:calc(100vh - 7.4rem); overflow:auto; }
      .panel-head { display:flex; align-items:center; justify-content:space-between; gap:.75rem; }
      .link { border:0; background:transparent; color:var(--text-soft); font-weight:700; }
      .search input { width:100%; min-height:3.1rem; padding:0 1rem; border:1px solid var(--panel-border); border-radius:16px; background:var(--field-bg); color:var(--text-main); }
      .mini input { min-height:2.9rem; }
      .search input::placeholder { color:var(--text-muted); }
      .suggestions { display:grid; gap:.55rem; }
      .suggestion { display:grid; gap:.15rem; padding:.8rem .95rem; border-radius:16px; text-align:left; }
      .genre-list { display:grid; max-height:22rem; overflow:auto; padding-right:.2rem; }
      .genre-item { display:flex; align-items:center; gap:.75rem; min-height:3rem; padding:0 1rem; border-radius:18px; text-align:left; font-weight:700; }
      .check { width:1.05rem; height:1.05rem; border-radius:8px; border:1px solid var(--accent-soft); background:var(--surface-hover); }
      .genre-item.active .check { background:linear-gradient(180deg,var(--accent-strong-soft),var(--accent-soft)); }
      @media (max-width:1180px) { .layout { grid-template-columns:1fr; } .sidebar { position:static; max-height:none; display:none; } .sidebar.open { display:grid; } }
      @media (max-width:720px) { .hero { justify-items:start; text-align:left; padding-top:1rem; } .grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
>>>>>>> Stashed changes
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogPageComponent implements OnInit {
  readonly store = inject(MangaStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly compactFormatter = new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1
  });

  readonly selectedGenre = signal('All Genres');
  readonly selectedYear = signal('All Years');
  readonly selectedSort = signal<SortMode>('Popularity');
  readonly searchQuery = signal('');
  readonly sortOptions: readonly SortMode[] = ['Popularity', 'Alphabetical'];

<<<<<<< Updated upstream
  readonly genreOptions = computed(() => this.store.genreOptions());
=======
  private searchDebounceHandle: number | null = null;
>>>>>>> Stashed changes

  readonly yearOptions = computed(() => [
    'All Years',
    ...new Set(
      this.store
        .mangaLibrary()
        .map((item) => item.year)
        .sort((left, right) => right - left)
        .map(String)
    )
  ]);

  readonly filteredManga = computed(() => {
    let result = [...this.store.mangaLibrary()];

    if (this.selectedGenre() !== 'All Genres') {
      result = result.filter((item) => item.genre.includes(this.selectedGenre()));
    }

    if (this.selectedYear() !== 'All Years') {
      result = result.filter((item) => item.year === Number(this.selectedYear()));
    }

    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      result = result.filter((item) => item.title.toLowerCase().includes(query));
    }

    return result.sort((left, right) =>
      this.selectedSort() === 'Popularity'
        ? right.popularity - left.popularity
        : left.title.localeCompare(right.title)
    );
  });

  readonly featuredItem = computed(() => this.filteredManga()[0] ?? null);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const genre = params.get('genre') ?? 'All Genres';
      const query = params.get('query') ?? '';

      if (genre !== this.selectedGenre()) {
        this.selectedGenre.set(genre);
        this.store.loadCatalog(genre, 1);
      }

      this.searchQuery.set(query);
    });
  }

  updateGenre(genre: string): void {
    this.selectedGenre.set(genre);
    this.store.loadCatalog(genre, 1);
  }

  updateSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  updateSort(sortMode: string): void {
    this.selectedSort.set(sortMode as SortMode);
  }

  previousPage(): void {
    const nextPage = Math.max(this.store.currentPage() - 1, 1);
    this.store.loadCatalog(this.selectedGenre(), nextPage);
  }

  nextPage(): void {
    const nextPage = Math.min(this.store.currentPage() + 1, this.store.totalPages());
    this.store.loadCatalog(this.selectedGenre(), nextPage);
  }

  firstGenre(item: MangaEntry): string {
    return item.genre[0] ?? 'Тайтл';
  }

  ratingFor(item: MangaEntry): string {
    const score = Math.min(9.9, 6.2 + Math.log10(Math.max(item.popularity, 1)) * 0.62);
    return score.toFixed(1);
  }

  compactViews(item: MangaEntry): string {
    return this.compactFormatter.format(item.popularity || 0);
  }
}
