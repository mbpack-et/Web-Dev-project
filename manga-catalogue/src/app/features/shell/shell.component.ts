import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { MangaStoreService } from '../../core/manga-store.service';
import { NavLinkComponent } from '../../shared/nav-link.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [NavLinkComponent, RouterLink, RouterOutlet],
  template: `
    <div class="shell">
      <header class="app-header">
        <div class="header-primary">
          <a class="brand" routerLink="/app">
            <span class="brand-mark" aria-hidden="true"></span>
            <span class="brand-copy">
              <strong>Manga-hub</strong>
            </span>
          </a>

          <nav class="app-nav" aria-label="Основная навигация">
            <app-nav-link route="/app" label="Главная" [exact]="true" />
            <app-nav-link route="/app/catalog" label="Каталог" />
            <app-nav-link route="/app/profile" label="Профиль" />
          </nav>
        </div>

        <div class="header-tools">
          <label class="search-field" aria-label="Поиск">
            <span class="search-icon" aria-hidden="true"></span>
            <input type="search" placeholder="Что ищем, семпай?" [value]="searchQuery()" (input)="onSearch($event)" />
          </label>

          <a class="icon-link" routerLink="/app/catalog" aria-label="Открыть каталог"></a>

          @if (store.isAuthenticated()) {
            <a class="account-link" routerLink="/app/profile">{{ store.userName() }}</a>
            <button type="button" class="ghost-action" (click)="logout()">Выйти</button>
          } @else {
            <a class="primary-action" routerLink="/login">Вход/Регистрация</a>
          }
        </div>
      </header>

      @if (store.isLoading()) {
        <p class="status-banner">Подгружаем каталог и обложки из MangaHook...</p>
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
        padding: 1.4rem clamp(1rem, 2vw, 1.8rem) 2rem;
      }

      .app-header {
        position: sticky;
        top: 0.8rem;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.95rem 1.15rem;
        border-radius: 24px;
        border: 1px solid var(--panel-border);
        background: var(--surface);
        backdrop-filter: blur(18px);
        box-shadow: var(--shadow);
      }

      .header-primary,
      .header-tools {
        display: flex;
        align-items: center;
        gap: 0.9rem;
      }

      .header-primary {
        flex: 1;
        min-width: 0;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.85rem;
        min-width: fit-content;
        color: var(--text-main);
        text-decoration: none;
      }

      .brand-copy {
        display: block;
      }

      .brand-copy strong {
        display: block;
        font-size: 1rem;
      }

      .brand-mark {
        position: relative;
        width: 3.1rem;
        height: 3.1rem;
        flex-shrink: 0;
        border-radius: 999px;
        background: var(--brand-mark-top);
        box-shadow:
          inset -10px -10px 18px rgba(0, 0, 0, 0.08),
          0 14px 30px rgba(0, 0, 0, 0.3);
      }

      .brand-mark::before,
      .brand-mark::after {
        content: '';
        position: absolute;
        border-radius: 999px;
        background: var(--brand-mark-cutout);
      }

      .brand-mark::before {
        inset: 0.52rem 1.28rem 1.54rem 0.7rem;
        transform: rotate(-18deg);
      }

      .brand-mark::after {
        inset: 1.56rem 0.72rem 0.48rem 1.34rem;
        transform: rotate(-18deg);
      }

      .app-nav {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        min-width: 0;
        overflow-x: auto;
      }

      .app-nav::-webkit-scrollbar {
        display: none;
      }

      .search-field {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        width: min(22rem, 100%);
        min-height: 3rem;
        padding: 0 1rem;
        border-radius: 999px;
        border: 1px solid var(--panel-border);
        background: var(--field-bg);
      }

      .search-field input {
        width: 100%;
        border: 0;
        outline: 0;
        color: var(--text-main);
        background: transparent;
      }

      .search-field input::placeholder {
        color: var(--text-muted);
      }

      .search-icon {
        position: relative;
        width: 1rem;
        height: 1rem;
        flex-shrink: 0;
        border: 2px solid var(--search-icon);
        border-radius: 999px;
      }

      .search-icon::after {
        content: '';
        position: absolute;
        width: 0.42rem;
        height: 0.12rem;
        right: -0.28rem;
        bottom: -0.12rem;
        border-radius: 999px;
        background: var(--search-icon);
        transform: rotate(45deg);
      }

      .icon-link,
      .account-link,
      .ghost-action,
      .primary-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 3rem;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 700;
      }

      .icon-link {
        width: 3rem;
        border: 1px solid var(--panel-border);
        background: var(--chip-bg);
      }

      .icon-link::before {
        content: '';
        width: 1.05rem;
        height: 1.05rem;
        border-radius: 999px;
        box-shadow:
          -0.26rem -0.02rem 0 0 rgba(255, 255, 255, 0.95),
          0.22rem 0 0 0 var(--surface-strong);
      }

      .account-link,
      .ghost-action {
        padding: 0 1rem;
        border: 1px solid var(--panel-border);
        background: var(--chip-bg);
        color: var(--text-main);
      }

      .ghost-action {
        font: inherit;
      }

      .primary-action {
        padding: 0 1.25rem;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: #ffffff;
        box-shadow: var(--accent-shadow);
      }

      .shell-content {
        width: min(100%, 1440px);
        margin: 0 auto;
        padding-top: 1.35rem;
      }

      .status-banner,
      .error-banner {
        width: min(100%, 1440px);
        margin: 1rem auto 0;
        padding: 0.95rem 1rem;
        border-radius: 16px;
        border: 1px solid var(--panel-border);
        background: var(--chip-bg);
        font-weight: 700;
      }

      .status-banner {
        color: var(--text-soft);
      }

      .error-banner {
        color: #ffb6bd;
        border-color: rgba(255, 99, 132, 0.18);
      }

      @media (max-width: 1100px) {
        .app-header {
          flex-direction: column;
          align-items: stretch;
        }

        .header-primary,
        .header-tools {
          width: 100%;
          flex-wrap: wrap;
        }

        .search-field {
          flex: 1 1 16rem;
          width: auto;
        }
      }

      @media (max-width: 720px) {
        .account-link,
        .ghost-action,
        .primary-action {
          flex: 1 1 auto;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent implements OnInit {
  readonly store = inject(MangaStoreService);
  readonly searchQuery = signal('');
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.store.ensureCatalogLoaded();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value;
    this.searchQuery.set(query);

    void this.router.navigate(['/app/catalog'], {
      queryParams: { query },
      queryParamsHandling: 'merge'
    });
  }

  logout(): void {
    this.store.logout();
    void this.router.navigateByUrl('/app');
  }
}
