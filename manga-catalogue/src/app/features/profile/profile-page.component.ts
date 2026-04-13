import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { MangaStatus } from '../../core/manga-data';
import { MangaStoreService } from '../../core/manga-store.service';
import { PanelCardComponent } from '../../shared/panel-card.component';
import { SegmentedControlComponent } from '../../shared/segmented-control.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [PanelCardComponent, SegmentedControlComponent],
  template: `
    <section class="profile-page">
      <header class="page-header">
        <p class="eyebrow">User Profile</p>
        <h1>{{ store.userName() }}</h1>
        <p>
          Keep up with friends, switch between reading statuses, and manage the manga already
          inside your personal list.
        </p>
      </header>

      <section class="profile-grid">
        <app-panel-card
          eyebrow="Community"
          title="Friends List"
          description="People you are currently following and what they are reading."
          tone="sky"
        >
          <div class="friend-stack">
            @for (friend of store.friends(); track friend.id) {
              <article class="friend-card">
                <div class="avatar">{{ friend.name.charAt(0) }}</div>
                <div>
                  <strong>{{ friend.name }}</strong>
                  <p>{{ friend.handle }}</p>
                </div>
                <span>{{ friend.currentlyReading }}</span>
              </article>
            }
          </div>
        </app-panel-card>

        <app-panel-card
          eyebrow="Collection"
          title="My Manga List"
          description="Switch the filter to see what you are reading now, what you finished, and what is queued next."
          tone="plum"
        >
          <app-segmented-control
            label="Status Filter"
            [options]="statusOptions"
            [selected]="selectedStatus()"
            [fullWidth]="true"
            (selectionChange)="updateStatus($event)"
          />

          <div class="manga-stack">
            @for (item of filteredManga(); track item.id) {
              <article class="manga-row">
                <div>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.genre.join(' / ') }}</p>
                </div>
                <div class="manga-metrics">
                  <span>{{ item.year }}</span>
                  <span>{{ item.chapters }} ch</span>
                </div>
              </article>
            } @empty {
              <article class="empty-list">
                <strong>No manga in this shelf yet</strong>
                <p>Once MangaHook data is available, your mocked reading states will appear here.</p>
              </article>
            }
          </div>
        </app-panel-card>
      </section>
    </section>
  `,
  styles: [
    `
      .profile-page {
        display: grid;
        gap: 1.25rem;
      }

      .page-header {
        display: grid;
        gap: 0.55rem;
        padding: 1.4rem 1.5rem;
        border-radius: 1.8rem;
        background: rgba(255, 248, 242, 0.68);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
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

      .page-header h1 {
        font-size: clamp(2rem, 4vw, 3rem);
        color: #3f1f68;
      }

      .page-header p:last-child {
        max-width: 42rem;
        line-height: 1.6;
        color: rgba(63, 31, 104, 0.78);
      }

      .profile-grid {
        display: grid;
        grid-template-columns: 1fr 1.35fr;
        gap: 1.25rem;
      }

      .friend-stack,
      .manga-stack {
        display: grid;
        gap: 0.8rem;
      }

      .friend-card,
      .manga-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.85rem;
        padding: 0.9rem 1rem;
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.14);
      }

      .avatar {
        width: 2.5rem;
        height: 2.5rem;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.22);
        font-weight: 800;
      }

      .friend-card div:nth-child(2) {
        flex: 1;
      }

      .friend-card p,
      .manga-row p {
        color: rgba(255, 255, 255, 0.78);
      }

      .friend-card span,
      .manga-metrics span {
        padding: 0.5rem 0.75rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
        font-size: 0.88rem;
        font-weight: 700;
      }

      .manga-metrics {
        display: flex;
        gap: 0.55rem;
      }

      .empty-list {
        padding: 1rem;
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.14);
      }

      .empty-list p {
        margin-top: 0.35rem;
        color: rgba(255, 255, 255, 0.78);
      }

      @media (max-width: 920px) {
        .profile-grid {
          grid-template-columns: 1fr;
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

  updateStatus(status: string): void {
    this.selectedStatus.set(status as MangaStatus);
  }
}
