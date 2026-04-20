import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

type ThemeMode = 'dark' | 'light';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly theme = signal<ThemeMode>('dark');

  ngOnInit(): void {
    this.setTheme(this.getInitialTheme());
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private getInitialTheme(): ThemeMode {
    if (!this.isBrowser) {
      return 'dark';
    }

    const savedTheme = localStorage.getItem('theme-mode');

    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  private setTheme(theme: ThemeMode): void {
    this.theme.set(theme);

    if (!this.isBrowser) {
      return;
    }

    document.documentElement.dataset['theme'] = theme;
    localStorage.setItem('theme-mode', theme);
  }
}
