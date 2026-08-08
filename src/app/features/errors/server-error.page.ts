import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND } from '../../core/constants/app.constants';
import { SeoService } from '../../core/services/seo.service';
import { IconComponent } from '../../shared/components/ui/icon.component';

@Component({
  selector: 'app-server-error-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="pt-[calc(var(--header-h)+4rem)] pb-24">
      <div class="container-lux">
        <div class="mx-auto max-w-2xl text-center">
          <span
            class="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-500/30 bg-amber-50 text-amber-700"
          >
            <app-icon name="alert" [size]="34" />
          </span>
          <p class="mt-7 font-display text-[5rem] leading-none text-clay-600/20 sm:text-[7rem]">500</p>
          <h1 class="-mt-4 text-4xl leading-tight sm:text-5xl">
            Something went wrong
            <span class="text-gradient-clay italic">at our end</span>
          </h1>
          <p class="mx-auto mt-5 max-w-lg leading-relaxed text-ink-600">
            This is our fault, not yours. The restaurant is still open and still cooking. Try again
            in a moment, or just call us and we will take your order the old-fashioned way.
          </p>

          <div class="mt-9 flex flex-wrap justify-center gap-3">
            <button type="button" class="btn btn-primary btn-lg" (click)="reload()">
              <app-icon name="refresh" [size]="16" />
              Try again
            </button>
            <a [href]="'tel:' + brand.phone" class="btn btn-secondary btn-lg">
              <app-icon name="phone" [size]="16" />
              {{ brand.phoneDisplay }}
            </a>
          </div>

          <div class="panel mx-auto mt-12 max-w-lg p-6 text-left">
            <p class="eyebrow mb-3">If you are running this demo locally</p>
            <p class="text-sm leading-relaxed text-ink-600">
              This build talks to a JSON Server backend on port 3000. If the API is not running,
              start it with:
            </p>
            <code
              class="mt-3 block rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 font-mono text-sm text-ink-800"
              >npm run api</code
            >
            <p class="mt-3 text-caption text-ink-500">
              Or run <code class="font-mono">npm start</code> to launch the API and the app together.
            </p>
          </div>

          <div class="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <a routerLink="/" class="text-ink-500 transition-colors hover:text-clay-700">Home</a>
            <a routerLink="/menu" class="text-ink-500 transition-colors hover:text-clay-700">Menu</a>
            <a routerLink="/reservation" class="text-ink-500 transition-colors hover:text-clay-700"
              >Book a table</a
            >
            <a routerLink="/contact" class="text-ink-500 transition-colors hover:text-clay-700"
              >Contact</a
            >
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ServerErrorPage {
  private readonly seo = inject(SeoService);
  protected readonly brand = BRAND;

  constructor() {
    this.seo.apply({
      title: 'Something Went Wrong | Salateen Restaurant Swabi',
      description: 'An unexpected error occurred. Please try again or call the restaurant.',
      path: '500',
      noIndex: true,
    });
  }

  protected reload(): void {
    if (typeof window !== 'undefined') window.location.reload();
  }
}
