import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MangaEntry } from '../../core/manga-data';
import { MangaStoreService } from '../../core/manga-store.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="dashboard-page">
      @if (featuredManga(); as featured) {
        <section class="hero-section">
          <div class="hero-copy">
            <p class="eyebrow">Популярное сегодня</p>
            <h1>{{ featured.title }}</h1>
            <p class="hero-summary">{{ featured.synopsis }}</p>

            <div class="hero-tags">
              <span>{{ featured.genre.join(' / ') }}</span>
              <span>{{ featured.author }}</span>
              <span>{{ featured.chapters }} глав</span>
              <span>{{ compactViews(featured) }} просмотров</span>
            </div>

            <div class="hero-actions">
              <a routerLink="/app/catalog" class="primary-link">Открыть каталог</a>
              <a [routerLink]="['/app/title', featured.id]" class="secondary-link">Страница тайтла</a>
            </div>
          </div>

          <a class="hero-visual" [routerLink]="['/app/title', featured.id]">
            <img [src]="featured.image" [alt]="featured.title" loading="eager" />

            <div class="hero-overlay">
              <span>{{ featured.updated }}</span>
              <strong>{{ featured.latestChapter }}</strong>
              <small>Рейтинг {{ ratingFor(featured) }}</small>
            </div>
          </a>
        </section>

        <section class="poster-track">
          @for (item of spotlightShelf(); track item.id) {
            <a class="poster-card compact card-link" [routerLink]="['/app/title', item.id]">
              <div class="poster-frame">
                <img [src]="item.image" [alt]="item.title" loading="lazy" />
                <span class="rating-badge">&#9733; {{ ratingFor(item) }}</span>
              </div>
              <p class="poster-meta">{{ item.year }} · {{ firstGenre(item) }}</p>
              <h3>{{ item.title }}</h3>
            </a>
          }
        </section>

        <section class="content-layout">
          <div class="content-main">
            <section class="content-section">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Подборка дня</p>
                  <h2>Горячие новинки</h2>
                </div>
                <a routerLink="/app/catalog">Смотреть всё</a>
              </div>

              <div class="poster-row">
                @for (item of hotReleases(); track item.id) {
                  <a class="poster-card card-link" [routerLink]="['/app/title', item.id]">
                    <div class="poster-frame">
                      <img [src]="item.image" [alt]="item.title" loading="lazy" />
                      <span class="rating-badge">&#9733; {{ ratingFor(item) }}</span>
                    </div>
                    <p class="poster-meta">{{ item.year }} · {{ firstGenre(item) }}</p>
                    <h3>{{ item.title }}</h3>
                  </a>
                }
              </div>
            </section>

            <section class="content-section">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Сильные позиции</p>
                  <h2>Популярное сейчас</h2>
                </div>
                <a routerLink="/app/profile">Мои подборки</a>
              </div>

              <div class="poster-row">
                @for (item of popularShelf(); track item.id) {
                  <a class="poster-card card-link" [routerLink]="['/app/title', item.id]">
                    <div class="poster-frame">
                      <img [src]="item.image" [alt]="item.title" loading="lazy" />
                      <span class="rating-badge">&#9733; {{ ratingFor(item) }}</span>
                    </div>
                    <p class="poster-meta">{{ item.year }} · {{ firstGenre(item) }}</p>
                    <h3>{{ item.title }}</h3>
                  </a>
                }
              </div>
            </section>

            <section class="updates-section">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Обновления</p>
                  <h2>Свежие главы</h2>
                </div>
              </div>

              <div class="updates-grid">
                @for (item of updateFeed(); track item.id) {
                  <a class="update-card card-link" [routerLink]="['/app/title', item.id]">
                    <img [src]="item.image" [alt]="item.title" loading="lazy" />
                    <div class="update-copy">
                      <p>{{ firstGenre(item) }} · {{ item.year }}</p>
                      <h3>{{ item.title }}</h3>
                      <span>{{ item.latestChapter }}</span>
                    </div>
                  </a>
                }
              </div>
            </section>
          </div>

          <aside class="content-side">
            <section class="side-card">
              <div class="section-head compact-head">
                <div>
                  <p class="eyebrow">Топ за неделю</p>
                  <h2>Рейтинг тайтлов</h2>
                </div>
              </div>

              <div class="ranking-list">
                @for (item of topTitles(); track item.id; let index = $index) {
                  <a class="ranking-link" [routerLink]="['/app/title', item.id]">
                    <span>{{ index + 1 }}</span>
                    <div>
                      <strong>{{ item.title }}</strong>
                      <small>{{ compactViews(item) }} просмотров</small>
                    </div>
                    <em>{{ ratingFor(item) }}</em>
                  </a>
                }
              </div>
            </section>

            <section class="side-card">
              <div class="section-head compact-head">
                <div>
                  <p class="eyebrow">Коллекции</p>
                  <h2>Что почитать дальше</h2>
                </div>
              </div>

              <div class="genre-cloud">
                @for (genre of collectionGenres(); track genre) {
                  <a [routerLink]="['/app/catalog']" [queryParams]="{ genre }">{{ genre }}</a>
                }
              </div>

              <div class="mini-stack">
                @for (item of recommendations(); track item.id) {
                  <a class="mini-link" [routerLink]="['/app/title', item.id]">
                    <strong>{{ item.title }}</strong>
                    <small>{{ firstGenre(item) }} · {{ item.year }}</small>
                  </a>
                }
              </div>
            </section>
          </aside>
        </section>
      } @else {
        <section class="empty-state">
          <p class="eyebrow">Каталог пуст</p>
          <h2>Обложки и подборки появятся после загрузки API</h2>
          <p>
            Как только MangaHook ответит через прокси, эта страница превратится в полноценную
            витрину с постерами, рейтингами и полками.
          </p>
        </section>
      }
    </section>
  `,
  styles: [
    `
      .dashboard-page {
        display: grid;
        gap: 1.35rem;
      }

      .hero-section,
      .content-section,
      .updates-section,
      .side-card,
      .empty-state {
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(18, 20, 25, 0.9);
        box-shadow: 0 24px 56px rgba(0, 0, 0, 0.28);
      }

      .hero-section {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(280px, 420px);
        gap: 1.25rem;
        padding: 1.4rem;
        border-radius: 30px;
        background:
          radial-gradient(circle at left top, rgba(79, 140, 255, 0.2), transparent 36%),
          linear-gradient(180deg, rgba(19, 21, 27, 0.98), rgba(13, 14, 18, 0.96));
      }

      .eyebrow {
        margin: 0 0 0.45rem;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(246, 247, 251, 0.56);
      }

      .hero-copy {
        display: grid;
        align-content: center;
        gap: 1rem;
      }

      .hero-copy h1,
      .content-section h2,
      .updates-section h2,
      .side-card h2,
      .empty-state h2 {
        margin: 0;
      }

      .hero-copy h1 {
        font-size: clamp(2.4rem, 5vw, 4.6rem);
        line-height: 0.92;
      }

      .hero-summary,
      .empty-state p {
        margin: 0;
        max-width: 44rem;
        color: rgba(246, 247, 251, 0.72);
        line-height: 1.7;
      }

      .hero-tags,
      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .hero-tags span,
      .genre-cloud a {
        padding: 0.7rem 0.9rem;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.05);
        font-weight: 700;
      }

      .primary-link,
      .secondary-link,
      .section-head a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 3rem;
        padding: 0 1.2rem;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 700;
      }

      .primary-link {
        background: linear-gradient(135deg, #4f8cff, #3873f0);
        color: #ffffff;
        box-shadow: 0 16px 28px rgba(56, 115, 240, 0.32);
      }

      .secondary-link,
      .section-head a {
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.04);
        color: #ffffff;
      }

      .hero-visual {
        position: relative;
        overflow: hidden;
        border-radius: 24px;
        min-height: 30rem;
        color: inherit;
        text-decoration: none;
      }

      .hero-visual img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .hero-visual::after {
        content: '';
        position: absolute;
        inset: 0;
        background:
          linear-gradient(180deg, rgba(13, 14, 18, 0.12), rgba(13, 14, 18, 0.8)),
          linear-gradient(0deg, rgba(13, 14, 18, 0.55), transparent 40%);
      }

      .hero-overlay {
        position: absolute;
        left: 1rem;
        right: 1rem;
        bottom: 1rem;
        z-index: 1;
        display: grid;
        gap: 0.25rem;
        padding: 1rem;
        border-radius: 18px;
        background: rgba(11, 12, 15, 0.68);
        backdrop-filter: blur(12px);
      }

      .hero-overlay span,
      .hero-overlay small {
        color: rgba(246, 247, 251, 0.66);
      }

      .hero-overlay strong {
        font-size: 1.15rem;
      }

      .poster-track,
      .poster-row {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(150px, 190px);
        gap: 1rem;
        max-width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
      }

      .poster-track {
        padding-bottom: 0.35rem;
      }

      .poster-track::-webkit-scrollbar,
      .poster-row::-webkit-scrollbar {
        display: none;
      }

      .poster-card {
        min-width: 0;
      }

      .card-link,
      .mini-link,
      .ranking-link,
      .genre-cloud a {
        color: inherit;
        text-decoration: none;
      }

      .poster-card h3,
      .update-copy h3 {
        margin: 0.35rem 0 0;
        font-family: 'Manrope', sans-serif;
        font-size: 1.1rem;
        line-height: 1.25;
      }

      .poster-card.compact h3 {
        font-size: 1rem;
      }

      .poster-frame {
        position: relative;
        overflow: hidden;
        aspect-ratio: 0.72;
        border-radius: 22px;
        margin-bottom: 0.8rem;
        background: rgba(255, 255, 255, 0.04);
      }

      .poster-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 220ms ease;
      }

      .poster-card:hover .poster-frame img {
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

      .poster-meta,
      .update-copy p,
      .update-copy span,
      .ranking-link small,
      .mini-link small {
        margin: 0;
        color: rgba(246, 247, 251, 0.58);
      }

      .content-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 1.25rem;
        align-items: start;
      }

      .content-main,
      .content-side {
        display: grid;
        gap: 1.25rem;
        min-width: 0;
      }

      .content-side {
        position: relative;
        z-index: 2;
      }

      .content-section,
      .updates-section,
      .side-card,
      .empty-state {
        padding: 1.25rem;
        border-radius: 26px;
        overflow: hidden;
      }

      .side-card {
        position: relative;
        z-index: 2;
        background: rgb(18 20 25 / 0.98);
      }

      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .section-head h2 {
        font-size: clamp(1.4rem, 2vw, 1.9rem);
      }

      .compact-head {
        margin-bottom: 1.2rem;
      }

      .updates-grid,
      .mini-stack,
      .ranking-list {
        display: grid;
        gap: 0.9rem;
      }

      .update-card,
      .mini-link,
      .ranking-link {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 0.8rem;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      .update-card img {
        width: 4.5rem;
        height: 6rem;
        object-fit: cover;
        border-radius: 14px;
      }

      .update-copy {
        display: grid;
        gap: 0.25rem;
      }

      .ranking-link {
        display: grid;
        grid-template-columns: 2.2rem minmax(0, 1fr) auto;
      }

      .ranking-link span {
        display: grid;
        place-items: center;
        width: 2.2rem;
        height: 2.2rem;
        border-radius: 999px;
        background: rgba(79, 140, 255, 0.18);
        color: #ffffff;
        font-weight: 800;
      }

      .ranking-link strong,
      .mini-link strong {
        display: block;
      }

      .ranking-link em {
        font-style: normal;
        color: #ffffff;
        font-weight: 800;
      }

      .genre-cloud {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
        gap: 0.65rem;
        margin-bottom: 1rem;
      }

      .empty-state {
        min-height: 16rem;
        align-content: center;
      }

      @media (max-width: 1100px) {
        .hero-section,
        .content-layout {
          grid-template-columns: 1fr;
        }

        .hero-visual {
          min-height: 24rem;
        }
      }

      @media (max-width: 720px) {
        .hero-copy h1 {
          font-size: 2.45rem;
        }

        .section-head {
          flex-direction: column;
          align-items: flex-start;
        }

        .poster-track,
        .poster-row {
          grid-auto-columns: minmax(138px, 156px);
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  private readonly store = inject(MangaStoreService);
  private readonly compactFormatter = new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1
  });

  readonly featuredManga = computed(() => this.store.popularNow() ?? this.store.lastManga());
  readonly spotlightShelf = computed(() => this.store.mangaLibrary().slice(0, 9));
  readonly hotReleases = computed(() =>
    [...this.store.mangaLibrary()]
      .sort((left, right) => right.year - left.year || right.popularity - left.popularity)
      .slice(0, 8)
  );
  readonly popularShelf = computed(() =>
    [...this.store.mangaLibrary()].sort((left, right) => right.popularity - left.popularity).slice(0, 8)
  );
  readonly updateFeed = computed(() =>
    [...this.store.mangaLibrary()]
      .sort((left, right) => right.chapters - left.chapters || right.popularity - left.popularity)
      .slice(0, 5)
  );
  readonly topTitles = computed(() =>
    [...this.store.mangaLibrary()].sort((left, right) => right.popularity - left.popularity).slice(0, 5)
  );
  readonly recommendations = computed(() => this.store.recommendations());
  readonly collectionGenres = computed(() => {
    const frequency = new Map<string, number>();

    for (const item of this.store.mangaLibrary()) {
      for (const genre of item.genre) {
        frequency.set(genre, (frequency.get(genre) ?? 0) + 1);
      }
    }

    return [...frequency.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([genre]) => genre)
      .slice(0, 8);
  });

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
