import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from '../../auth.service';
import { MangaStoreService } from '../../core/manga-store.service';
import { NavLinkComponent } from '../../shared/nav-link.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [NavLinkComponent, RouterLink, RouterOutlet],
  template: `
    <div class="shell">
      <header class="app-header">
        <a class="brand" routerLink="/app">
          <span class="brand-mark">MC</span>
          <span>
            <strong>Manga Catalog System</strong>
            <small>{{ store.userName() }}</small>
          </span>
        </a>

        <nav class="app-nav" aria-label="Primary navigation">
          <app-nav-link route="/app/profile" label="Profile" />
          <app-nav-link route="/app/catalog" label="All Manga List" />
        </nav>

        <button type="button" class="logout" (click)="logout()">Logout</button>
      </header>

      @if (store.isLoading()) {
        <p class="status-banner">Syncing manga from Django API...</p>
      }

      @if (store.errorMessage()) {
        <p class="error-banner">{{ store.errorMessage() }}</p>
      }

      <main class="shell-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
        padding: 1.2rem;
      }

      .app-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.2rem;
        border-radius: 1.6rem;
        background: rgba(84, 38, 133, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 1.4rem 2.8rem rgba(83, 39, 130, 0.18);
        backdrop-filter: blur(16px);
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.9rem;
        color: #fff8fd;
        text-decoration: none;
      }

      .brand strong,
      .brand small {
        display: block;
      }

      .brand strong {
        font-size: 1rem;
      }

      .brand small {
        margin-top: 0.18rem;
        color: rgba(255, 241, 248, 0.76);
      }

      .brand-mark {
        width: 3rem;
        height: 3rem;
        border-radius: 1rem;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #f5972d, #ffbf59);
        color: #552a09;
        font-weight: 800;
      }

      .app-nav {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        flex: 1;
      }

      .logout {
        border: 0;
        border-radius: 999px;
        padding: 0.8rem 1rem;
        background: rgba(255, 255, 255, 0.14);
        color: #fff8fd;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      .shell-content {
        padding-block: 1.3rem 1.6rem;
      }

      .status-banner,
      .error-banner {
        margin: 1rem 0 0;
        padding: 0.9rem 1rem;
        border-radius: 1rem;
        font-weight: 600;
      }

      .status-banner {
        background: rgba(255, 247, 241, 0.74);
        color: #4d266d;
      }

      .error-banner {
        background: rgba(255, 239, 239, 0.92);
        color: #91254a;
      }

      @media (max-width: 840px) {
        .app-header {
          flex-direction: column;
          align-items: stretch;
        }

        .app-nav {
          justify-content: flex-start;
          flex-wrap: wrap;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent implements OnInit {
  readonly store = inject(MangaStoreService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.store.ensureCatalogLoaded();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.store.logout();
        void this.router.navigateByUrl('/login');
      },
      error: () => {
        this.store.logout();
        void this.router.navigateByUrl('/login');
      }
    });
  }
}
