import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PanelTone } from '../core/manga-data';

@Component({
  selector: 'app-panel-card',
  standalone: true,
  template: `
    <article
      class="panel-card"
      [class.tone-plum]="tone() === 'plum'"
      [class.tone-indigo]="tone() === 'indigo'"
      [class.tone-sky]="tone() === 'sky'"
      [class.tone-gold]="tone() === 'gold'"
      [class.compact]="compact()"
    >
      <header class="card-header">
        @if (eyebrow()) {
          <p class="eyebrow">{{ eyebrow() }}</p>
        }
        <h2>{{ title() }}</h2>
        @if (description()) {
          <p class="description">{{ description() }}</p>
        }
      </header>

      <div class="card-body">
        <ng-content />
      </div>
    </article>
  `,
  styles: [
    `
      .panel-card {
        position: relative;
        display: grid;
        gap: 1.25rem;
        height: 100%;
        padding: 1.5rem;
        border-radius: 1.75rem;
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 1.5rem 3rem rgba(57, 28, 107, 0.16);
        overflow: hidden;
      }

      .panel-card::after {
        content: '';
        position: absolute;
        inset: auto -20% -40% auto;
        width: 11rem;
        height: 11rem;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.14);
        filter: blur(10px);
      }

      .panel-card.compact {
        padding: 1.25rem;
      }

      .tone-plum {
        background: linear-gradient(160deg, #5d2f8e 0%, #7b3ea9 100%);
        color: #fff8ff;
      }

      .tone-indigo {
        background: linear-gradient(160deg, #3540a6 0%, #5861d8 100%);
        color: #f6f7ff;
      }

      .tone-sky {
        background: linear-gradient(160deg, #3e83bb 0%, #69b8e6 100%);
        color: #eefbff;
      }

      .tone-gold {
        background: linear-gradient(160deg, #c7681b 0%, #f29a31 100%);
        color: #fff8f0;
      }

      .card-header {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 0.5rem;
      }

      .eyebrow {
        margin: 0;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        opacity: 0.78;
      }

      h2 {
        margin: 0;
        font-size: clamp(1.4rem, 3vw, 2rem);
        line-height: 1.05;
      }

      .description {
        margin: 0;
        max-width: 34rem;
        color: rgba(255, 255, 255, 0.84);
        line-height: 1.55;
      }

      .card-body {
        position: relative;
        z-index: 1;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelCardComponent {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly description = input('');
  readonly tone = input<PanelTone>('plum');
  readonly compact = input(false);
}
