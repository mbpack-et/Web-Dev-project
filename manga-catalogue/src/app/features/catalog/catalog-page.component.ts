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
  readonly sortOptions: readonly SortMode[] = ['Popularity', 'Alphabetical'];

  readonly genreOptions = computed(() => this.store.genreOptions());

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
      this.selectedGenre.set(genre);
      this.store.loadCatalog(genre, 1);
    });
  }

  updateGenre(genre: string): void {
    this.selectedGenre.set(genre);
    this.store.loadCatalog(genre, 1);
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
