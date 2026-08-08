import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BreadcrumbsComponent, Crumb } from './display.components';
import { ImageComponent } from './image.component';

/**
 * The masthead every inner page opens with: a full-bleed photograph, an
 * obsidian scrim, the breadcrumb trail and an `h1`.
 *
 * Keeping it in one component guarantees the heading hierarchy is consistent
 * across forty routes, which matters for both SEO and screen readers.
 */
@Component({
  selector: 'app-page-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImageComponent, BreadcrumbsComponent],
  host: { class: 'block' },
  template: `
    <header class="grain-overlay relative isolate overflow-hidden" [class]="heightClass()">
      <app-image
        [src]="image()"
        [alt]="imageAlt()"
        [priority]="true"
        sizes="100vw"
        class="absolute inset-0 h-full w-full"
      />
      <div
        class="absolute inset-0 bg-gradient-to-b from-scrim/55 via-scrim/62 to-scrim/88"
        aria-hidden="true"
      ></div>
      <div
        class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-scrim/85 to-transparent"
        aria-hidden="true"
      ></div>

      <div class="on-photo container-lux relative flex h-full flex-col justify-end pb-12 md:pb-16">
        @if (crumbs().length) {
          <app-breadcrumbs [crumbs]="crumbs()" class="mb-5" />
        }
        @if (eyebrow()) {
          <p class="eyebrow mb-3">{{ eyebrow() }}</p>
        }
        <h1 class="max-w-3xl text-4xl leading-[1.05] text-white sm:text-5xl lg:text-6xl">
          {{ title() }}
          @if (accent()) {
            <span class="text-gradient-clay italic">{{ accent() }}</span>
          }
        </h1>
        @if (description()) {
          <p class="mt-5 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
            {{ description() }}
          </p>
        }
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeroComponent {
  readonly title = input.required<string>();
  readonly accent = input('');
  readonly eyebrow = input('');
  readonly description = input('');
  readonly image = input('assets/images/interior/main-dining-hall');
  readonly imageAlt = input('The main dining hall at Salateen Restaurant Swabi');
  readonly crumbs = input<Crumb[]>([]);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected heightClass(): string {
    return {
      sm: 'min-h-[38vh] pt-[calc(var(--header-h)+2rem)]',
      md: 'min-h-[52vh] pt-[calc(var(--header-h)+3rem)]',
      lg: 'min-h-[66vh] pt-[calc(var(--header-h)+4rem)]',
    }[this.size()];
  }
}
