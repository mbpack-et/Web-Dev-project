import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-segmented-control',
  standalone: true,
  template: `
    <section class="segmented-control" [class.full-width]="fullWidth()">
      @if (label()) {
        <p class="control-label">{{ label() }}</p>
      }

      <div class="segments">
        @for (option of options(); track option) {
          <button
            type="button"
            class="segment"
            [class.is-active]="option === selected()"
            (click)="selectionChange.emit(option)"
          >
            {{ option }}
          </button>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .segmented-control {
        display: grid;
        gap: 0.75rem;
      }

      .control-label {
        margin: 0;
        color: rgba(246, 247, 251, 0.7);
        font-size: 0.85rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .segments {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
      }

      .full-width .segments {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
      }

      .segment {
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 999px;
        padding: 0.72rem 1rem;
        background: rgba(255, 255, 255, 0.04);
        color: rgba(246, 247, 251, 0.78);
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        transition:
          transform 180ms ease,
          background-color 180ms ease,
          border-color 180ms ease,
          color 180ms ease,
          box-shadow 180ms ease;
      }

      .segment:hover,
      .segment:focus-visible {
        transform: translateY(-1px);
        border-color: rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 12px 20px rgba(0, 0, 0, 0.18);
      }

      .segment.is-active {
        border-color: rgba(79, 140, 255, 0.34);
        background: rgba(79, 140, 255, 0.18);
        color: #ffffff;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SegmentedControlComponent {
  readonly label = input('');
  readonly options = input.required<readonly string[]>();
  readonly selected = input.required<string>();
  readonly fullWidth = input(false);

  readonly selectionChange = output<string>();
}
