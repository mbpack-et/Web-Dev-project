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
        color: rgba(66, 38, 117, 0.85);
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
        border: 0;
        border-radius: 999px;
        padding: 0.72rem 1rem;
        background: rgba(255, 255, 255, 0.74);
        color: #4e287f;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        transition:
          transform 180ms ease,
          background-color 180ms ease,
          color 180ms ease,
          box-shadow 180ms ease;
      }

      .segment:hover,
      .segment:focus-visible {
        transform: translateY(-1px);
        box-shadow: 0 0.8rem 1.4rem rgba(80, 44, 139, 0.14);
      }

      .segment.is-active {
        background: #4f2c81;
        color: #fff9fd;
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
