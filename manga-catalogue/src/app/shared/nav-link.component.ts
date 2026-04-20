import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav-link',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <a
      class="nav-link"
      [routerLink]="route()"
      routerLinkActive="is-active"
      [routerLinkActiveOptions]="{ exact: exact() }"
    >
      {{ label() }}
    </a>
  `,
  styles: [
    `
      .nav-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.9rem;
        padding: 0.75rem 1.15rem;
        border-radius: 999px;
        border: 1px solid transparent;
        background: var(--chip-bg);
        color: var(--text-soft);
        text-decoration: none;
        font-weight: 700;
        letter-spacing: 0.02em;
        transition:
          transform 180ms ease,
          border-color 180ms ease,
          background-color 180ms ease,
          color 180ms ease,
          box-shadow 180ms ease;
      }

      .nav-link:hover,
      .nav-link:focus-visible {
        background: var(--chip-hover);
        border-color: var(--panel-border);
        color: var(--text-main);
        transform: translateY(-1px);
      }

      .nav-link.is-active {
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: #fff;
        box-shadow: var(--accent-shadow);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavLinkComponent {
  readonly route = input.required<string>();
  readonly label = input.required<string>();
  readonly exact = input(false);
}
