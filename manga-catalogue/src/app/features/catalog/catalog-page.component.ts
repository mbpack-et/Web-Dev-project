import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { MangaStoreService } from '../../core/manga-store.service';
import { PanelCardComponent } from '../../shared/panel-card.component';
import { SegmentedControlComponent } from '../../shared/segmented-control.component';

type SortMode = 'Popularity' | 'Alphabetical';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [PanelCardComponent, SegmentedControlComponent],
  template: `
    <section class="catalog-page">
      <header class="catalog-header">
        <div>
          <p class="eyebrow">Manga Catalog</p>
          <h1>All Manga List</h1>
          <p class="subcopy">
            Browse the full library, filter by genre or year, and switch between popularity and
            alphabetical order.
          </p>
        </div>
        <div class="catalog-stats">
          <strong>{{ filteredManga().length }}</strong>
          <span>series shown</span>
        </div>
      </header>

      <section class="filter-stack">
        <app-segmented-control
          label="Genre"
          [options]="genreOptions()"
          [selected]="selectedGenre()"
          (selectionChange)="updateGenre($event)"
        />

        <app-segmented-control
          label="Year"
          [options]="yearOptions()"
          [selected]="selectedYear()"
          (selectionChange)="selectedYear.set($event)"
        />

        <app-segmented-control
          label="Sort By"
          [options]="sortOptions"
          [selected]="selectedSort()"
          (selectionChange)="updateSort($event)"
        />
      </section>

      <section class="pagination-bar">
        <button type="button" (click)="previousPage()" [disabled]="store.currentPage() === 1">
          Previous
        </button>
        <span>Page {{ store.currentPage() }} / {{ store.totalPages() }}</span>
        <button
          type="button"
          (click)="nextPage()"
          [disabled]="store.currentPage() >= store.totalPages()"
        >
          Next
        </button>
      </section>

      <section class="catalog-grid">
        @for (item of filteredManga(); track item.id) {
          <app-panel-card
            [eyebrow]="item.status"
            [title]="item.title"
            [description]="item.synopsis"
            [tone]="item.accent"
            [compact]="true"
          >
            <div class="catalog-card-meta">
              <span>{{ item.genre.join(' / ') }}</span>
              <span>{{ item.year }}</span>
              <span>Popularity {{ item.popularity }}</span>
            </div>
          </app-panel-card>
        } @empty {
          <article class="empty-catalog">
            <strong>No manga matched these filters</strong>
            <p>Try another genre, another year, or add more manga via the Django API.</p>
          </article>
        }
      </section>
    </section>
  `,
  styles: [
    `
      .catalog-page {
        display: grid;
        gap: 1.25rem;
      }

      .catalog-header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.5rem;
        border-radius: 1.9rem;
        background: rgba(255, 247, 241, 0.72);
      }

      .eyebrow {
        margin: 0;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #6a338d;
      }

      h1,
      p {
        margin: 0;
      }

      .catalog-header h1 {
        margin-top: 0.4rem;
        font-size: clamp(2rem, 4vw, 3rem);
        color: #3f1f68;
      }

      .subcopy {
        margin-top: 0.65rem;
        max-width: 40rem;
        line-height: 1.6;
        color: rgba(63, 31, 104, 0.78);
      }

      .catalog-stats {
        min-width: 8rem;
        text-align: center;
        padding: 1rem 1.2rem;
        border-radius: 1.4rem;
        background: linear-gradient(160deg, #5c2f8e, #3558b7);
        color: #fff;
      }

      .catalog-stats strong {
        display: block;
        font-size: 2rem;
      }

      .filter-stack {
        display: grid;
        gap: 1rem;
        padding: 1.3rem 1.4rem;
        border-radius: 1.8rem;
        background: rgba(255, 247, 241, 0.56);
      }

      .catalog-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
        gap: 1rem;
      }

      .pagination-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.2rem;
        border-radius: 1.4rem;
        background: rgba(255, 247, 241, 0.56);
      }

      .pagination-bar button {
        border: 0;
        border-radius: 999px;
        padding: 0.72rem 1rem;
        background: #4f2c81;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      .pagination-bar button:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }

      .pagination-bar span {
        color: rgba(63, 31, 104, 0.78);
        font-weight: 700;
      }

      .catalog-card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
      }

      .catalog-card-meta span {
        padding: 0.55rem 0.8rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
        font-size: 0.88rem;
        font-weight: 700;
      }

      .empty-catalog {
        padding: 1.4rem;
        border-radius: 1.5rem;
        background: rgba(255, 247, 241, 0.72);
      }

      .empty-catalog p {
        margin-top: 0.45rem;
        color: rgba(63, 31, 104, 0.78);
      }

      @media (max-width: 840px) {
        .catalog-header {
          flex-direction: column;
          align-items: start;
        }

        .pagination-bar {
          flex-direction: column;
          align-items: stretch;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogPageComponent implements OnInit {
  readonly store = inject(MangaStoreService);

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

  ngOnInit(): void {
    this.store.ensureCatalogLoaded();
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
}
