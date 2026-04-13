import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MangaStoreService } from '../../core/manga-store.service';
import { PanelCardComponent } from '../../shared/panel-card.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [PanelCardComponent, RouterLink],
  template: `
    <section class="dashboard-page">
      @if (lastManga(); as activeManga) {
        <section class="recent-banner">
          <div>
            <p class="eyebrow">Recent Activity</p>
            <h1>Your Last Manga</h1>
            <h2>{{ activeManga.title }}</h2>
            <p class="banner-copy">{{ activeManga.synopsis }}</p>
          </div>

          <div class="banner-meta">
            <span>{{ activeManga.status }}</span>
            <span>{{ activeManga.genre.join(' / ') }}</span>
            <span>{{ activeManga.chapters }} chapters</span>
          </div>
        </section>

        <section class="dashboard-grid">
          @if (popularNow(); as popularTitle) {
            <app-panel-card
              class="popular-column"
              eyebrow="Featured Spotlight"
              title="Popular Now"
              [description]="popularTitle.synopsis"
              [tone]="popularTitle.accent"
            >
              <div class="feature-card">
                <div>
                  <p class="series-title">{{ popularTitle.title }}</p>
                  <p class="series-meta">
                    {{ popularTitle.genre.join(' / ') }} • {{ popularTitle.year }}
                  </p>
                </div>

                <div class="metrics">
                  <span>Popularity {{ popularTitle.popularity }}</span>
                  <span>{{ popularTitle.chapters }} chapters</span>
                </div>

                <a routerLink="/app/catalog" class="inline-link">Browse the full catalog</a>
              </div>
            </app-panel-card>
          }

          <div class="right-column">
            <app-panel-card
              eyebrow="Personal Picks"
              title="Recommendations"
              description="A short stack based on what you are tracking right now."
              tone="indigo"
              [compact]="true"
            >
              <div class="recommendations">
                @for (item of recommendations(); track item.id) {
                  <article class="recommendation-item">
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.genre[0] }} • {{ item.year }}</span>
                  </article>
                } @empty {
                  <p class="empty-copy">Recommendations will appear once the catalog sync completes.</p>
                }
              </div>
            </app-panel-card>

            <section class="top-hundred">
              <div class="triangle"></div>
              <div class="top-content">
                <p class="eyebrow">Leaderboard</p>
                <h2>Top 100</h2>
                <p>Jump straight into the ranking view and explore fan favorites.</p>
                <a routerLink="/app/catalog" class="cta-link">Open catalog</a>
              </div>
            </section>
          </div>
        </section>
      } @else {
        <section class="empty-state">
          <p class="eyebrow">Dashboard Waiting</p>
          <h2>No live manga loaded yet</h2>
          <p>
            This dashboard will populate from MangaHook as soon as the API proxy can reach a
            running backend.
          </p>
        </section>
      }
    </section>
  `,
  styles: [
    `
      .dashboard-page {
        display: grid;
        gap: 1.25rem;
      }

      .recent-banner {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.5rem;
        border-radius: 2rem;
        background:
          linear-gradient(120deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0)),
          linear-gradient(135deg, #ff9833, #f06e1e);
        color: #fff9f4;
        box-shadow: 0 1.6rem 3rem rgba(176, 84, 18, 0.18);
      }

      .eyebrow {
        margin: 0 0 0.45rem;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      .recent-banner h1 {
        font-size: clamp(1.6rem, 3vw, 2.4rem);
      }

      .recent-banner h2 {
        margin-top: 0.55rem;
        font-size: clamp(2rem, 5vw, 3.25rem);
      }

      .banner-copy {
        margin-top: 0.85rem;
        max-width: 42rem;
        color: rgba(255, 249, 244, 0.88);
        line-height: 1.6;
      }

      .banner-meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.75rem;
      }

      .banner-meta span {
        padding: 0.7rem 0.95rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.15);
        font-weight: 700;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: 1.65fr 1fr;
        gap: 1.25rem;
      }

      .popular-column {
        min-height: 25rem;
      }

      .feature-card {
        display: grid;
        align-content: space-between;
        gap: 1.2rem;
        min-height: 100%;
      }

      .series-title {
        font-size: clamp(1.8rem, 4vw, 2.8rem);
        font-weight: 800;
      }

      .series-meta,
      .metrics {
        color: rgba(255, 255, 255, 0.82);
      }

      .metrics {
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
      }

      .metrics span {
        padding: 0.7rem 0.9rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
      }

      .right-column {
        display: grid;
        gap: 1.25rem;
      }

      .recommendations {
        display: grid;
        gap: 0.75rem;
      }

      .recommendation-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.85rem 1rem;
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.12);
      }

      .recommendation-item span {
        color: rgba(246, 247, 255, 0.8);
      }

      .empty-copy {
        color: rgba(246, 247, 255, 0.84);
      }

      .top-hundred {
        position: relative;
        display: grid;
        align-items: center;
        justify-items: center;
        min-height: 14rem;
        padding: 1.2rem;
        border-radius: 1.8rem;
        background: linear-gradient(180deg, #5b2f8e, #3559b8);
        overflow: hidden;
        color: #fff8fe;
        box-shadow: 0 1.3rem 2.5rem rgba(54, 47, 141, 0.18);
      }

      .triangle {
        position: absolute;
        top: 1rem;
        right: 1rem;
        width: 0;
        height: 0;
        border-left: 4rem solid transparent;
        border-bottom: 4rem solid rgba(255, 188, 86, 0.9);
        filter: drop-shadow(0 0.75rem 1rem rgba(48, 23, 86, 0.2));
      }

      .top-content {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 0.6rem;
        text-align: center;
        max-width: 18rem;
      }

      .top-content p:last-of-type {
        color: rgba(255, 248, 254, 0.84);
        line-height: 1.55;
      }

      .inline-link,
      .cta-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: fit-content;
        border-radius: 999px;
        padding: 0.85rem 1rem;
        background: rgba(255, 255, 255, 0.16);
        color: #fff;
        font-weight: 700;
        text-decoration: none;
      }

      .cta-link {
        margin-inline: auto;
      }

      .empty-state {
        padding: 1.5rem;
        border-radius: 2rem;
        background: rgba(255, 247, 241, 0.74);
      }

      .empty-state h2 {
        margin: 0.3rem 0 0.6rem;
        color: #3f1f68;
      }

      .empty-state p:last-child {
        color: rgba(63, 31, 104, 0.78);
        line-height: 1.6;
      }

      @media (max-width: 960px) {
        .recent-banner,
        .dashboard-grid {
          grid-template-columns: 1fr;
        }

        .recent-banner {
          align-items: start;
        }

        .banner-meta {
          justify-content: flex-start;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  private readonly store = inject(MangaStoreService);

  readonly lastManga = this.store.lastManga;
  readonly popularNow = this.store.popularNow;
  readonly recommendations = computed(() => this.store.recommendations());
}
