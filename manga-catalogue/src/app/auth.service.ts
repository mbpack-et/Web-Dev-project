import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';

interface LoginResponse {
  access: string;
  refresh: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api';
  private readonly accessTokenKey = 'access_token';
  private readonly refreshTokenKey = 'refresh_token';

  private readonly platformId = inject(PLATFORM_ID);
  readonly isLoggedIn = signal<boolean>(this.hasAccessToken());

  constructor(private readonly http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login/`, { username, password })
      .pipe(tap((tokens) => this.saveTokens(tokens)));
  }

  logout(): Observable<unknown> {
    const refresh = this.getRefreshToken();
    const body = refresh ? { refresh } : {};

    return this.http.post(`${this.apiUrl}/auth/logout/`, body).pipe(
      tap({
        next: () => this.clearTokens(),
        error: () => this.clearTokens()
      })
    );
  }

  getAccessToken(): string | null {
    return this.getStorageItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return this.getStorageItem(this.refreshTokenKey);
  }

  clearTokens(): void {
    this.removeStorageItem(this.accessTokenKey);
    this.removeStorageItem(this.refreshTokenKey);
    this.isLoggedIn.set(false);
  }

  private saveTokens(tokens: LoginResponse): void {
    this.setStorageItem(this.accessTokenKey, tokens.access);
    this.setStorageItem(this.refreshTokenKey, tokens.refresh);
    this.isLoggedIn.set(true);
  }

  private hasAccessToken(): boolean {
    return !!this.getStorageItem(this.accessTokenKey);
  }

  private getStorageItem(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return window.localStorage.getItem(key);
  }

  private setStorageItem(key: string, value: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.localStorage.setItem(key, value);
  }

  private removeStorageItem(key: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.localStorage.removeItem(key);
  }
}
