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
      <section class="login-shell">
        <div class="showcase-panel">
          <p class="eyebrow">Вход</p>
          <h1>Витрина в стиле ReManga</h1>
          <p class="summary">
            Полностью тёмный интерфейс, большие обложки, карточки с рейтингом и быстрый вход в
            каталог без старого админского оформления.
          </p>

          <div class="cover-strip">
            <article class="cover-tile accent-blue">
              <span>Каталог</span>
              <strong>Большие карточки</strong>
            </article>
            <article class="cover-tile accent-red">
              <span>Новинки</span>
              <strong>Горизонтальные полки</strong>
            </article>
            <article class="cover-tile accent-gold">
              <span>Профиль</span>
              <strong>Тёмные панели</strong>
            </article>
          </div>
        </div>

        <div class="credentials-panel">
          <div class="credentials-head">
            <p class="eyebrow">Вход/Регистрация</p>
            <h2>Открыть каталог</h2>
            <div class="mode-toggle">
              <button
                type="button"
                class="toggle-btn"
                [class.active]="!isRegistering()"
                (click)="setMode(false)"
              >
                Вход
              </button>
              <button
                type="button"
                class="toggle-btn"
                [class.active]="isRegistering()"
                (click)="setMode(true)"
              >
                Регистрация
              </button>
            </div>
          </div>

          @if (!isRegistering()) {
            <label>
              <span>Имя</span>
              <input [(ngModel)]="userName" name="userName" placeholder="Mina Sato" />
            </label>

            <label>
              <span>Пароль</span>
              <input
                [(ngModel)]="password"
                name="password"
                type="password"
                placeholder="Введите любой пароль"
              />
            </label>
          } @else {
            <label>
              <span>Имя пользователя</span>
              <input
                [(ngModel)]="regUsername"
                name="regUsername"
                placeholder="username"
              />
            </label>

            <label>
              <span>Email</span>
              <input [(ngModel)]="regEmail" name="regEmail" type="email" placeholder="user@example.com" />
            </label>

            <label>
              <span>Пароль</span>
              <input
                [(ngModel)]="regPassword"
                name="regPassword"
                type="password"
                placeholder="Введите пароль"
              />
            </label>

            <label>
              <span>Подтвердите пароль</span>
              <input
                [(ngModel)]="regPasswordConfirm"
                name="regPasswordConfirm"
                type="password"
                placeholder="Подтвердите пароль"
              />
            </label>
          }

          @if (errorMessage()) {
            <p class="error">{{ errorMessage() }}</p>
          }

          <button type="button" (click)="submit()" [disabled]="isLoading()">
            {{ isRegistering() ? 'Создать аккаунт' : 'Перейти к витрине' }}
          </button>
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
        padding: 2rem 1rem;
      }

      .login-shell {
        width: min(100%, 72rem);
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(300px, 420px);
        gap: 1.5rem;
        padding: 1.35rem;
        border-radius: 32px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(16, 18, 22, 0.92);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
      }

      .showcase-panel,
      .credentials-panel {
        border-radius: 26px;
        padding: 1.45rem;
      }

      .showcase-panel {
        display: grid;
        gap: 1rem;
        align-content: center;
        background:
          radial-gradient(circle at top left, rgba(79, 140, 255, 0.22), transparent 36%),
          linear-gradient(180deg, rgba(24, 27, 35, 0.98), rgba(14, 16, 20, 0.98));
      }

      .credentials-panel {
        display: grid;
        gap: 1rem;
        align-content: center;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background: rgba(255, 255, 255, 0.03);
      }

      .eyebrow,
      label span {
        margin: 0;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(246, 247, 251, 0.58);
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        font-size: clamp(2.4rem, 5vw, 4.6rem);
        line-height: 0.92;
      }

      h2 {
        font-size: 1.8rem;
      }

      .summary {
        font-size: 1.02rem;
        line-height: 1.7;
        color: rgba(246, 247, 251, 0.7);
        max-width: 28rem;
      }

      .cover-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.85rem;
        margin-top: 0.8rem;
      }

      .cover-tile {
        display: grid;
        align-content: end;
        gap: 0.35rem;
        min-height: 15rem;
        padding: 1rem;
        border-radius: 22px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      .cover-tile span {
        color: rgba(246, 247, 251, 0.6);
        font-size: 0.9rem;
      }

      .cover-tile strong {
        font-size: 1.1rem;
        line-height: 1.3;
      }

      .accent-blue {
        background:
          linear-gradient(180deg, transparent, rgba(6, 9, 16, 0.7)),
          linear-gradient(145deg, #5aa0ff, #2c4d8e);
      }

      .accent-red {
        background:
          linear-gradient(180deg, transparent, rgba(12, 8, 9, 0.72)),
          linear-gradient(145deg, #e55b5b, #5c121e);
      }

      .accent-gold {
        background:
          linear-gradient(180deg, transparent, rgba(12, 9, 6, 0.7)),
          linear-gradient(145deg, #f2c15f, #70511d);
      }

      .credentials-head {
        display: grid;
        gap: 0.3rem;
      }

      .mode-toggle {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        margin-top: 0.8rem;
      }

      .toggle-btn {
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 0.6rem;
        background: rgba(255, 255, 255, 0.05);
        color: rgba(246, 247, 251, 0.6);
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 200ms ease;
      }

      .toggle-btn.active {
        background: linear-gradient(135deg, #4f8cff, #3873f0);
        color: #fff;
        border-color: rgba(79, 140, 255, 0.5);
      }

      .toggle-btn:hover {
        border-color: rgba(79, 140, 255, 0.3);
      }

      label {
        display: grid;
        gap: 0.55rem;
      }

      input {
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 18px;
        padding: 0.95rem 1rem;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.05);
      }

      input:focus {
        outline: 2px solid rgba(79, 140, 255, 0.35);
        outline-offset: 2px;
      }

      button {
        border: 0;
        border-radius: 999px;
        min-height: 3rem;
        padding: 0 1.2rem;
        background: linear-gradient(135deg, #4f8cff, #3873f0);
        color: #fff;
        font-weight: 700;
        transition:
          transform 180ms ease,
          box-shadow 180ms ease;
      }

      button:hover:not(:disabled),
      button:focus-visible:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 1rem 2rem rgba(56, 115, 240, 0.28);
      }

      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .error {
        color: #ffb6bd;
        font-weight: 600;
      }

      @media (max-width: 760px) {
        .login-shell {
          grid-template-columns: 1fr;
        }

        .cover-strip {
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

  readonly isRegistering = signal(false);
  readonly isLoading = signal(false);

  userName = 'Mina Sato';
  password = '';

  regUsername = '';
  regEmail = '';
  regPassword = '';
  regPasswordConfirm = '';

  readonly errorMessage = signal('');

  setMode(isRegistering: boolean): void {
    this.isRegistering.set(isRegistering);
    this.errorMessage.set('');
  }

  async submit(): Promise<void> {
    if (this.isRegistering()) {
      await this.handleRegister();
    } else {
      this.handleLogin();
    }
  }

  private handleLogin(): void {
    const loggedIn = this.store.login(this.userName, this.password);

    if (!loggedIn) {
      this.errorMessage.set('Заполни имя и пароль, чтобы открыть витрину.');
      return;
    }

    this.errorMessage.set('');
    this.store.ensureCatalogLoaded();
    void this.router.navigateByUrl('/app');
  }

  private async handleRegister(): Promise<void> {
    // Validation
    if (!this.regUsername.trim()) {
      this.errorMessage.set('Введи имя пользователя.');
      return;
    }

    if (!this.regEmail.trim() || !this.isValidEmail(this.regEmail)) {
      this.errorMessage.set('Введи корректный email.');
      return;
    }

    if (!this.regPassword.trim()) {
      this.errorMessage.set('Введи пароль.');
      return;
    }

    if (this.regPassword !== this.regPasswordConfirm) {
      this.errorMessage.set('Пароли не совпадают.');
      return;
    }

    if (this.regPassword.length < 6) {
      this.errorMessage.set('Пароль должен быть минимум 6 символов.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const success = await this.store.register(
        this.regUsername,
        this.regEmail,
        this.regPassword
      );

      if (success) {
        this.store.ensureCatalogLoaded();
        void this.router.navigateByUrl('/app');
      } else {
        this.errorMessage.set('Ошибка при создании аккаунта. Попробуй ещё раз.');
      }
    } catch (error) {
      this.errorMessage.set('Ошибка при создании аккаунта. Попробуй ещё раз.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
