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
        padding: 0.75rem 1rem;
        border-radius: 999px;
        color: rgba(255, 247, 237, 0.82);
        text-decoration: none;
        font-weight: 600;
        letter-spacing: 0.02em;
        transition:
          transform 180ms ease,
          background-color 180ms ease,
          color 180ms ease;
      }

      .nav-link:hover,
      .nav-link:focus-visible {
        background: rgba(255, 255, 255, 0.12);
        color: #fffaf6;
        transform: translateY(-1px);
      }

      .nav-link.is-active {
        background: rgba(82, 46, 138, 0.92);
        color: #fff;
        box-shadow: 0 1rem 2rem rgba(39, 14, 72, 0.18);
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
