import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MangaStoreService } from '../../core/manga-store.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="login-page">
      <section class="login-card">
        <div class="intro">
          <p class="eyebrow">Auth Gateway</p>
          <h1>Manga Catalog System</h1>
          <p class="summary">
            Sign in to open the dashboard, jump into your profile, and browse the full manga
            catalog with filters and ranking views.
          </p>
        </div>

        <div class="credentials">
          <label>
            <span>Username</span>
            <input [(ngModel)]="userName" name="userName" placeholder="Mina Sato" />
          </label>

          <label>
            <span>Password</span>
            <input
              [(ngModel)]="password"
              name="password"
              type="password"
              placeholder="Enter any password"
            />
          </label>

          @if (errorMessage()) {
            <p class="error">{{ errorMessage() }}</p>
          }

          <button type="button" (click)="submit()">Enter Dashboard</button>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .login-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 2rem;
      }

      .login-card {
        width: min(100%, 64rem);
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 1.5rem;
        padding: 1.5rem;
        border-radius: 2rem;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.1)),
          linear-gradient(135deg, #ff8a2b, #f26c17);
        box-shadow: 0 2rem 4rem rgba(78, 33, 2, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.24);
      }

      .intro,
      .credentials {
        border-radius: 1.5rem;
        padding: 1.5rem;
      }

      .intro {
        background: linear-gradient(160deg, rgba(86, 43, 146, 0.9), rgba(58, 113, 190, 0.76));
        color: #fff8fe;
        display: grid;
        align-content: space-between;
        gap: 1rem;
        min-height: 22rem;
      }

      .credentials {
        background: rgba(255, 247, 242, 0.9);
        display: grid;
        gap: 1rem;
        align-content: center;
      }

      .eyebrow,
      label span {
        margin: 0;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: clamp(2.2rem, 5vw, 4.2rem);
        line-height: 0.95;
      }

      .summary {
        margin: 0;
        font-size: 1.02rem;
        line-height: 1.7;
        color: rgba(255, 248, 254, 0.84);
        max-width: 28rem;
      }

      label {
        display: grid;
        gap: 0.55rem;
        color: #5f2e92;
      }

      input {
        width: 100%;
        border: 1px solid rgba(89, 44, 141, 0.16);
        border-radius: 1rem;
        padding: 0.9rem 1rem;
        font: inherit;
        color: #36165f;
        background: rgba(255, 255, 255, 0.96);
      }

      input:focus {
        outline: 2px solid rgba(84, 46, 138, 0.35);
        outline-offset: 2px;
      }

      button {
        border: 0;
        border-radius: 999px;
        padding: 0.95rem 1.2rem;
        background: linear-gradient(135deg, #4f2b81, #3555b7);
        color: #fff;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        transition:
          transform 180ms ease,
          box-shadow 180ms ease;
      }

      button:hover,
      button:focus-visible {
        transform: translateY(-1px);
        box-shadow: 0 1rem 2rem rgba(58, 35, 106, 0.22);
      }

      .error {
        margin: 0;
        color: #9d1d3f;
        font-weight: 600;
      }

      @media (max-width: 760px) {
        .login-card {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  private readonly store = inject(MangaStoreService);
  private readonly router = inject(Router);

  userName = 'Mina Sato';
  password = '';
  readonly errorMessage = signal('');

  submit(): void {
    const loggedIn = this.store.login(this.userName, this.password);

    if (!loggedIn) {
      this.errorMessage.set('Add both a username and password to continue.');
      return;
    }

    this.errorMessage.set('');
    this.store.ensureCatalogLoaded();
    void this.router.navigateByUrl('/app');
  }
}
