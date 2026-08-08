import {
  Directive,
  ElementRef,
  PLATFORM_ID,
  inject,
  input,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Scroll-reveal via IntersectionObserver.
 *
 * On the server (and where IntersectionObserver is missing) the element is
 * marked revealed immediately, so SSR output and no-JS crawlers see the
 * content rather than a page of invisible boxes.
 */
@Directive({
  selector: '[appReveal]',
  host: { '[attr.data-reveal]': '""' },
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  /** Stagger in milliseconds. Use on grid children: `[appRevealDelay]="i * 70"`. */
  readonly appRevealDelay = input(0);
  /** Fraction of the element that must be visible before it reveals. */
  readonly appRevealThreshold = input(0.12);

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private observer?: IntersectionObserver;
  private timer?: ReturnType<typeof setTimeout>;

  ngAfterViewInit(): void {
    const node = this.el.nativeElement as HTMLElement;

    if (!this.isBrowser || typeof IntersectionObserver === 'undefined') {
      node.classList.add('revealed');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const delay = this.appRevealDelay();
          if (delay > 0) {
            this.timer = setTimeout(() => node.classList.add('revealed'), delay);
          } else {
            node.classList.add('revealed');
          }
          this.observer?.unobserve(entry.target);
        }
      },
      { threshold: this.appRevealThreshold(), rootMargin: '0px 0px -8% 0px' },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.timer) clearTimeout(this.timer);
  }
}
