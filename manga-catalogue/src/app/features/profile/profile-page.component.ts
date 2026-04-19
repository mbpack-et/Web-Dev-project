import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MangaEntry, MangaStatus } from '../../core/manga-data';
import { MangaStoreService } from '../../core/manga-store.service';
import { SegmentedControlComponent } from '../../shared/segmented-control.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [RouterLink, SegmentedControlComponent],
  template: `
    <section class="profile-page">
      <header class="profile-hero">
        <div class="identity-block">
          <div class="avatar">{{ initials() }}</div>
          <div class="identity-copy">
            <p class="eyebrow">Профиль</p>
            <h1>{{ store.userName() }}</h1>
            <p>
              Полка с сохранёнными тайтлами, быстрый доступ к статусам чтения и список друзей,
              чтобы страница чувствовалась частью общей витрины.
            </p>
          </div>
        </div>

        <div class="stat-grid">
          <article>
            <strong>{{ store.mangaLibrary().length }}</strong>
            <span>в каталоге</span>
          </article>
          <article>
            <strong>{{ store.byStatus('Reading').length }}</strong>
            <span>читаю</span>
          </article>
          <article>
            <strong>{{ store.byStatus('Completed').length }}</strong>
            <span>завершено</span>
          </article>
          <article>
            <strong>{{ store.favorites().length }}</strong>
            <span>в избранном</span>
          </article>
        </div>
      </header>

      <section class="profile-layout">
        <section class="watchlist-panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Моя полка</p>
              <h2>Сохранённые тайтлы</h2>
            </div>
          </div>

          <app-segmented-control
            label="Статус"
            [options]="statusOptions"
            [selected]="selectedStatus()"
            [fullWidth]="true"
            (selectionChange)="updateStatus($event)"
          />

          <div class="watchlist-grid">
            @for (item of visibleShelf(); track item.id) {
              <a class="shelf-card" [routerLink]="['/app/title', item.id]">
                <div class="poster-frame">
                  <img [src]="item.image" [alt]="item.title" loading="lazy" />
                  <span class="rating-badge">&#9733; {{ ratingFor(item) }}</span>
                </div>
                <p>{{ item.year }} · {{ firstGenre(item) }}</p>
                <strong>{{ item.title }}</strong>
              </a>
            } @empty {
              <article class="empty-list">
                <strong>В этой полке пока пусто</strong>
                <p>Как только каталог обновится, сюда попадут тайтлы с выбранным статусом.</p>
              </article>
            }
          </div>
        </section>

        <aside class="social-column">
          <section class="side-panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Избранное</p>
                <h2>Быстрый доступ</h2>
              </div>
            </div>

            <div class="favorite-stack">
              @for (item of favoriteShelf(); track item.id) {
                <a class="favorite-card" [routerLink]="['/app/title', item.id]">
                  <img [src]="item.image" [alt]="item.title" loading="lazy" />
                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ firstGenre(item) }} · {{ item.year }}</p>
                  </div>
                </a>
              } @empty {
                <article class="empty-list compact-empty">
                  <strong>Избранное пока пустое</strong>
                  <p>Добавьте тайтл из его страницы, и он появится здесь.</p>
                </article>
              }
            </div>
          </section>

          <section class="side-panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Друзья</p>
                <h2>Кто читает рядом</h2>
              </div>
            </div>

            <div class="friend-stack">
              @for (friend of store.friends(); track friend.id) {
                <article class="friend-card">
                  <div class="friend-avatar">{{ friend.name.charAt(0) }}</div>
                  <div>
                    <strong>{{ friend.name }}</strong>
                    <p>{{ friend.handle }}</p>
                  </div>
                  <span>{{ friend.currentlyReading }}</span>
                </article>
              }
            </div>
          </section>

          <section class="side-panel focus-panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Фокус недели</p>
                <h2>Продолжить чтение</h2>
              </div>
            </div>

            @if (store.lastManga(); as activeManga) {
              <a class="focus-card" [routerLink]="['/app/title', activeManga.id]">
                <img [src]="activeManga.image" [alt]="activeManga.title" loading="lazy" />
                <div>
                  <p>{{ activeManga.latestChapter }}</p>
                  <strong>{{ activeManga.title }}</strong>
                  <span>{{ activeManga.genre.join(' / ') }}</span>
                </div>
              </a>
            }
          </section>
        </aside>
      </section>
    </section>
  `,
  styles: [
    `
      .profile-page {
        display: grid;
        gap: 1.3rem;
      }

      .profile-hero,
      .watchlist-panel,
      .side-panel {
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(18, 20, 25, 0.9);
        box-shadow: 0 24px 56px rgba(0, 0, 0, 0.28);
      }

      .profile-hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 1.2rem;
        align-items: center;
        padding: 1.35rem;
        border-radius: 28px;
      }

      .eyebrow {
        margin: 0;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(246, 247, 251, 0.56);
      }

      .identity-block {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .avatar {
        display: grid;
        place-items: center;
        width: 5rem;
        height: 5rem;
        border-radius: 999px;
        background: linear-gradient(135deg, #4f8cff, #79a6ff);
        color: #ffffff;
        font-size: 1.4rem;
        font-weight: 800;
        box-shadow: 0 16px 28px rgba(56, 115, 240, 0.28);
      }

      .identity-copy {
        display: grid;
        gap: 0.45rem;
      }

      .identity-copy h1,
      .panel-head h2,
      .empty-list strong,
      .empty-list p {
        margin: 0;
      }

      .identity-copy h1 {
        font-size: clamp(2rem, 4vw, 3.3rem);
      }

      .identity-copy p:last-child,
      .friend-card p,
      .focus-card p,
      .focus-card span,
      .shelf-card p,
      .favorite-card p,
      .empty-list p {
        margin: 0;
        line-height: 1.6;
        color: rgba(246, 247, 251, 0.64);
      }

      .stat-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(6rem, 1fr));
        gap: 0.85rem;
      }

      .stat-grid article {
        padding: 1rem;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.05);
        text-align: center;
      }

      .stat-grid strong {
        display: block;
        font-size: 1.8rem;
      }

      .stat-grid span {
        color: rgba(246, 247, 251, 0.58);
      }

      .profile-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) 360px;
        gap: 1.25rem;
      }

      .watchlist-panel,
      .side-panel {
        padding: 1.25rem;
        border-radius: 26px;
      }

      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .watchlist-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }

      .poster-frame {
        position: relative;
        overflow: hidden;
        aspect-ratio: 0.72;
        margin-bottom: 0.75rem;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.04);
      }

      .poster-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
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

      .shelf-card,
      .favorite-card,
      .focus-card {
        color: inherit;
        text-decoration: none;
      }

      .shelf-card strong {
        display: block;
        margin-top: 0.25rem;
        font-size: 1rem;
        line-height: 1.3;
      }

      .social-column,
      .friend-stack,
      .favorite-stack {
        display: grid;
        gap: 1rem;
      }

      .friend-card,
      .focus-card,
      .favorite-card,
      .empty-list {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 0.85rem;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.04);
      }

      .favorite-card img,
      .focus-card img {
        width: 5.2rem;
        height: 7rem;
        object-fit: cover;
        border-radius: 16px;
      }

      .favorite-card div,
      .focus-card div {
        flex: 1;
      }

      .favorite-card strong {
        display: block;
        margin-bottom: 0.25rem;
      }

      .friend-avatar {
        width: 2.8rem;
        height: 2.8rem;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: rgba(79, 140, 255, 0.18);
        font-weight: 800;
      }

      .friend-card div:nth-child(2) {
        flex: 1;
      }

      .friend-card span {
        max-width: 9rem;
        color: rgba(246, 247, 251, 0.58);
        font-size: 0.88rem;
      }

      .empty-list {
        grid-column: 1 / -1;
      }

      .compact-empty {
        grid-column: auto;
      }

      @media (max-width: 920px) {
        .profile-hero,
        .profile-layout {
          grid-template-columns: 1fr;
        }

        .stat-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent {
  readonly store = inject(MangaStoreService);
  readonly statusOptions: readonly MangaStatus[] = ['Reading', 'Completed', 'Plan to Read'];
  readonly selectedStatus = signal<MangaStatus>('Reading');

  readonly filteredManga = computed(() => this.store.byStatus(this.selectedStatus()));
  readonly visibleShelf = computed(() => this.filteredManga().slice(0, 8));
  readonly favoriteShelf = computed(() => this.store.favorites().slice(0, 4));

  updateStatus(status: string): void {
    this.selectedStatus.set(status as MangaStatus);
  }

  initials(): string {
    return this.store
      .userName()
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  firstGenre(item: MangaEntry): string {
    return item.genre[0] ?? 'Тайтл';
  }

  ratingFor(item: MangaEntry): string {
    const score = Math.min(9.9, 6.2 + Math.log10(Math.max(item.popularity, 1)) * 0.62);
    return score.toFixed(1);
  }
}
