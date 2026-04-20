import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MangaEntry } from '../../core/manga-data';
import { MangaStoreService } from '../../core/manga-store.service';

@Component({
  selector: 'app-manga-detail-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="detail-page">
      @if (resolvedTitle(); as title) {
        <section class="detail-hero">
          <div class="poster-column">
            <div class="poster-shell">
              <img [src]="resolvedImage()" [alt]="title" loading="eager" />
            </div>

            <div class="utility-card">
              <div class="utility-head">
                <p class="eyebrow">Утилиты</p>
                <h2>Ваши действия</h2>
              </div>

              @if (store.isAuthenticated()) {
                <button type="button" class="utility-button" (click)="toggleFavorite()">
                  {{ store.isFavorite(mangaId) ? 'Убрать из избранного' : 'Добавить в избранное' }}
                </button>

                <div class="rating-tools">
                  <span>Мой рейтинг</span>
                  <div class="rating-row">
                    @for (star of ratingScale; track star) {
                      <button
                        type="button"
                        class="rating-chip"
                        [class.is-active]="store.getUserRating(mangaId) >= star"
                        (click)="setRating(star)"
                      >
                        {{ star }}
                      </button>
                    }
                  </div>
                  <small>Выставлено: {{ store.getUserRating(mangaId) || 'нет' }}</small>
                </div>
              } @else {
                <p class="utility-copy">
                  Чтобы оценивать тайтлы и добавлять их в избранное, сначала войдите в аккаунт.
                </p>
                <a class="utility-button login-link" routerLink="/login">Перейти ко входу</a>
              }

              @if (utilityMessage()) {
                <p class="utility-note">{{ utilityMessage() }}</p>
              }
            </div>
          </div>

          <div class="content-column">
            <div class="headline-block">
              <p class="eyebrow">Страница тайтла</p>
              <h1>{{ title }}</h1>
              <p class="summary">{{ resolvedSynopsis() }}</p>
            </div>

            <div class="stats-grid">
              <article>
                <span>Автор</span>
                <strong>{{ resolvedAuthor() }}</strong>
              </article>
              <article>
                <span>Год</span>
                <strong>{{ resolvedYear() }}</strong>
              </article>
              <article>
                <span>Рейтинг</span>
                <strong>{{ computedRating() }}</strong>
              </article>
              <article>
                <span>Статус</span>
                <strong>{{ resolvedStatus() }}</strong>
              </article>
              <article>
                <span>Глав</span>
                <strong>{{ resolvedChapters() }}</strong>
              </article>
              <article>
                <span>Обновлено</span>
                <strong>{{ resolvedUpdated() }}</strong>
              </article>
            </div>

            <section class="info-panel">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Жанры</p>
                  <h2>Теги и направление</h2>
                </div>
              </div>

              <div class="genre-cloud">
                @for (genre of resolvedGenres(); track genre) {
                  <a [routerLink]="['/app/catalog']" [queryParams]="{ genre }">{{ genre }}</a>
                }
              </div>
            </section>

            <section class="info-panel">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Главы</p>
                  <h2>Последние обновления</h2>
                </div>
              </div>

              <div class="chapter-stack">
                @for (chapter of visibleChapters(); track chapter.id) {
                  <article class="chapter-card">
                    <div>
                      <strong>{{ chapter.name }}</strong>
                      <p>{{ chapter.createdAt }}</p>
                    </div>
                    <span>{{ chapter.view }}</span>
                  </article>
                } @empty {
                  <article class="chapter-card empty-card">
                    <div>
                      <strong>Список глав ещё загружается</strong>
                      <p>Попробуйте открыть страницу чуть позже.</p>
                    </div>
                  </article>
                }
              </div>
            </section>
          </div>
        </section>
      }
    </section>
  `,
  styles: [
    `
      .detail-page {
        display: grid;
      }

      .detail-hero,
      .info-panel,
      .utility-card {
        border: 1px solid var(--panel-border);
        background: var(--surface);
        box-shadow: var(--poster-shadow);
      }

      .detail-hero {
        display: grid;
        grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
        gap: 1.25rem;
        padding: 1.35rem;
        border-radius: 30px;
      }

      .poster-column,
      .content-column {
        display: grid;
        gap: 1rem;
        align-content: start;
      }

      .poster-shell {
        overflow: hidden;
        border-radius: 24px;
        aspect-ratio: 0.72;
        background: var(--field-bg);
      }

      .poster-shell img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .utility-card,
      .info-panel {
        padding: 1.2rem;
        border-radius: 24px;
      }

      .eyebrow {
        margin: 0;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--text-muted);
      }

      .headline-block,
      .utility-head {
        display: grid;
        gap: 0.45rem;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        font-size: clamp(2.4rem, 5vw, 4.2rem);
        line-height: 0.95;
      }

      h2 {
        font-size: 1.5rem;
      }

      .summary,
      .utility-copy,
      .utility-note,
      .chapter-card p {
        color: var(--text-soft);
        line-height: 1.65;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 0.9rem;
      }

      .stats-grid article,
      .chapter-card {
        padding: 0.95rem 1rem;
        border-radius: 18px;
        background: var(--chip-bg);
      }

      .stats-grid span {
        display: block;
        margin-bottom: 0.35rem;
        color: var(--text-muted);
        font-size: 0.88rem;
      }

      .stats-grid strong {
        font-size: 1.05rem;
      }

      .section-head {
        margin-bottom: 1rem;
      }

      .genre-cloud {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .genre-cloud a,
      .utility-button,
      .login-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.85rem;
        padding: 0 1rem;
        border-radius: 999px;
        border: 1px solid var(--panel-border);
        background: var(--chip-bg);
        color: var(--text-main);
        text-decoration: none;
        font-weight: 700;
      }

      .utility-button {
        width: 100%;
        border: 0;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        box-shadow: var(--accent-shadow);
      }

      .login-link {
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        box-shadow: var(--accent-shadow);
      }

      .rating-tools {
        display: grid;
        gap: 0.75rem;
      }

      .rating-tools span,
      .rating-tools small {
        color: var(--text-soft);
      }

      .rating-row {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 0.5rem;
      }

      .rating-chip {
        min-height: 2.8rem;
        border-radius: 16px;
        border: 1px solid var(--panel-border);
        background: var(--chip-bg);
        color: var(--text-main);
        font-weight: 800;
      }

      .rating-chip.is-active {
        background: var(--accent-strong-soft);
        border-color: var(--accent-soft);
      }

      .chapter-stack {
        display: grid;
        gap: 0.75rem;
      }

      .chapter-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .chapter-card strong {
        display: block;
        margin-bottom: 0.25rem;
      }

      .chapter-card span {
        color: var(--text-soft);
        white-space: nowrap;
      }

      .empty-card {
        justify-content: flex-start;
      }

      @media (max-width: 980px) {
        .detail-hero {
          grid-template-columns: 1fr;
        }

        .poster-column {
          grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
          align-items: start;
        }
      }

      @media (max-width: 720px) {
        .poster-column {
          grid-template-columns: 1fr;
        }

        .rating-row {
          grid-template-columns: repeat(5, minmax(2.5rem, 1fr));
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MangaDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(MangaStoreService);

  readonly mangaId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly ratingScale = [1, 2, 3, 4, 5];
  readonly utilityMessage = signal('');

  readonly manga = computed(() => this.store.getMangaById(this.mangaId));
  readonly detail = computed(() => this.store.getMangaDetail(this.mangaId));
  readonly visibleChapters = computed(() => this.detail()?.chapterList.slice(0, 12) ?? []);

  ngOnInit(): void {
    this.store.ensureMangaDetail(this.mangaId);
  }

  resolvedTitle(): string {
    return this.manga()?.title || this.detail()?.name || 'Загрузка тайтла...';
  }

  resolvedImage(): string {
    return this.manga()?.image || this.detail()?.imageUrl || '';
  }

  resolvedSynopsis(): string {
    return this.manga()?.synopsis || this.detail()?.description || 'Описание загружается.';
  }

  resolvedAuthor(): string {
    return this.manga()?.author || this.detail()?.author || 'Unknown author';
  }

  resolvedYear(): string {
    const year = this.manga()?.year || this.detail()?.year;
    return year ? String(year) : '—';
  }

  resolvedStatus(): string {
    return this.detail()?.status || this.manga()?.status || 'Unknown';
  }

  resolvedChapters(): string {
    const chapters = this.detail()?.chapterList.length || this.manga()?.chapters || 0;
    return String(chapters);
  }

  resolvedUpdated(): string {
    return this.manga()?.updated || this.detail()?.updated || 'Unknown update date';
  }

  resolvedGenres(): string[] {
    return this.detail()?.genres?.length ? this.detail()!.genres : this.manga()?.genre ?? [];
  }

  computedRating(): string {
    const backendRating = this.store.getAverageRating(this.mangaId);
    if (backendRating && backendRating > 0) {
      return backendRating.toFixed(1);
    }

    const item = this.manga();

    if (!item) {
      return '—';
    }

    const score = Math.min(9.9, 6.2 + Math.log10(Math.max(item.popularity, 1)) * 0.62);
    return score.toFixed(1);
  }

  async toggleFavorite(): Promise<void> {
    const updated = await this.store.toggleFavorite(this.mangaId);
    this.utilityMessage.set(updated ? 'Избранное обновлено.' : 'Для этого нужно войти.');
  }

  async setRating(value: number): Promise<void> {
    const updated = await this.store.setUserRating(this.mangaId, value);
    this.utilityMessage.set(updated ? `Ваш рейтинг: ${value}/5.` : 'Для этого нужно войти.');
  }
}
