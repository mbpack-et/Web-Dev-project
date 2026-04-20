import { isPlatformBrowser } from '@angular/common';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, share, tap } from 'rxjs/operators';

const STORAGE_ACCESS = 'mb_access';
const STORAGE_REFRESH = 'mb_refresh';
const STORAGE_USERNAME = 'mb_username';

@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly rawHttp = new HttpClient(inject(HttpBackend));
  private refreshInFlight$: Observable<string | null> | undefined;
  private onSessionCleared: () => void = () => {};

  /** Called after tokens (and stored username) are removed — e.g. reset UI auth state. */
  registerSessionClearHandler(handler: () => void): void {
    this.onSessionCleared = handler;
  }

  getAccess(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem(STORAGE_ACCESS);
  }

  getRefresh(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem(STORAGE_REFRESH);
  }

  getStoredUsername(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem(STORAGE_USERNAME);
  }

  setTokens(access: string, refresh: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(STORAGE_ACCESS, access);
    localStorage.setItem(STORAGE_REFRESH, refresh);
  }

  setAccess(access: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(STORAGE_ACCESS, access);
  }

  setRefresh(refresh: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(STORAGE_REFRESH, refresh);
  }

  setStoredUsername(name: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(STORAGE_USERNAME, name);
  }

  clear(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_ACCESS);
      localStorage.removeItem(STORAGE_REFRESH);
      localStorage.removeItem(STORAGE_USERNAME);
    }
    this.onSessionCleared();
  }

  hasAccessToken(): boolean {
    return !!this.getAccess();
  }

  /**
   * Refreshes access using refresh token. Uses HttpBackend so the request skips auth interceptors.
   */
  refreshAccess$(): Observable<string | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(null);
    }

    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refresh = this.getRefresh();
    if (!refresh) {
      this.clear();
      return of(null);
    }

    this.refreshInFlight$ = this.rawHttp
      .post<{ access: string; refresh?: string }>('/api/auth/refresh/', { refresh })
      .pipe(
        tap((body) => {
          this.setAccess(body.access);
          if (body.refresh) {
            this.setRefresh(body.refresh);
          }
        }),
        map((body) => body.access),
        catchError(() => {
          this.clear();
          return of(null);
        }),
        finalize(() => {
          this.refreshInFlight$ = undefined;
        }),
        share()
      );

    return this.refreshInFlight$;
  }
}
