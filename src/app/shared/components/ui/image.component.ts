import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/**
 * Responsive image with an LQIP background.
 *
 * The build produces four WebP variants per photo: `-sm` (400w), `-md` (800w),
 * the base (1600w) and `-blur` (24w). This component wires them into a single
 * `srcset` and paints the blur underneath, so there is no layout shift and no
 * grey flash. Pass `priority` on the LCP image to opt out of lazy loading.
 */
@Component({
  selector: 'app-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The host box (block / relative / overflow-hidden) is styled by an
  // `app-image` rule in the base layer rather than by host classes. As classes
  // they sat in the utilities layer, where `.relative` is emitted after
  // `.absolute` — so a caller passing `absolute inset-0` was silently ignored
  // and the image stretched its container to the intrinsic height.
  template: `
    <img
      [src]="blurSrc()"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 h-full w-full scale-110 blur-xl transition-opacity duration-700"
      [class.opacity-0]="loaded()"
      [attr.fetchpriority]="'low'"
      decoding="async"
    />
    <img
      [src]="mainSrc()"
      [srcset]="srcset()"
      [attr.sizes]="sizes()"
      [alt]="alt()"
      [attr.width]="width()"
      [attr.height]="height()"
      [attr.loading]="priority() ? 'eager' : 'lazy'"
      [attr.fetchpriority]="priority() ? 'high' : 'auto'"
      [attr.decoding]="priority() ? 'sync' : 'async'"
      class="relative h-full w-full transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
      [class]="objectFit()"
      [class.opacity-0]="!loaded()"
      [class.scale-105]="!loaded()"
      (load)="loaded.set(true)"
      (error)="onError()"
    />
  `,
})
export class ImageComponent {
  /** Base path with no size suffix, e.g. `assets/images/food/kabuli-pulao`. */
  readonly src = input.required<string>();
  readonly alt = input.required<string>();
  readonly width = input<number | null>(null);
  readonly height = input<number | null>(null);
  readonly sizes = input('(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw');
  readonly priority = input(false);
  readonly objectFit = input<'object-cover' | 'object-contain'>('object-cover');

  protected readonly loaded = signal(false);
  private readonly failed = signal(false);

  protected readonly mainSrc = computed(() =>
    this.failed() ? FALLBACK : `${this.base()}-md.webp`,
  );

  protected readonly blurSrc = computed(() =>
    this.failed() ? FALLBACK : `${this.base()}-blur.webp`,
  );

  protected readonly srcset = computed(() => {
    if (this.failed()) return '';
    const base = this.base();
    return `${base}-sm.webp 400w, ${base}-md.webp 800w, ${base}.webp 1600w`;
  });

  private base(): string {
    // Tolerate paths that already carry an extension, so callers can pass
    // either `.../kabuli-pulao` or `.../kabuli-pulao.webp`.
    return this.src().replace(/\.(webp|jpe?g|png|avif)$/i, '');
  }

  protected onError(): void {
    this.failed.set(true);
    this.loaded.set(true);
  }
}

/** Inline clay monogram on paper. Never 404s, never blocks paint. */
const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f3efe9"/><text x="200" y="160" text-anchor="middle" font-family="Georgia,serif" font-size="64" fill="#d5cdc1">S</text></svg>`,
  );
