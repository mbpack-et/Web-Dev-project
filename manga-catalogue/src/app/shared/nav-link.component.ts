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
        background: rgba(255, 255, 255, 0.04);
        color: rgba(246, 247, 251, 0.82);
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
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.08);
        color: #ffffff;
        transform: translateY(-1px);
      }

      .nav-link.is-active {
        background: linear-gradient(135deg, #4f8cff, #3873f0);
        color: #fff;
        box-shadow: 0 14px 28px rgba(53, 105, 220, 0.34);
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
