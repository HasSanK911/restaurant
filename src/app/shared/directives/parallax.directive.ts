import {
  AfterViewInit,
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Lightweight vertical parallax.
 *
 * Runs outside Angular's zone and writes transforms inside rAF, so scrolling
 * never triggers change detection. Disabled entirely for users who asked for
 * reduced motion, and on the server.
 */
@Directive({ selector: '[appParallax]' })
export class ParallaxDirective implements AfterViewInit, OnDestroy {
  /** Positive moves slower than the page. 0.15 to 0.35 reads well. */
  readonly appParallax = input(0.2);

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private ticking = false;
  private observer?: IntersectionObserver;
  private visible = false;
  private onScroll?: () => void;

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const node = this.el.nativeElement as HTMLElement;
    node.style.willChange = 'transform';

    // Only listen while the element is anywhere near the viewport.
    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible) this.update();
      },
      { rootMargin: '25% 0px' },
    );
    this.observer.observe(node);

    this.zone.runOutsideAngular(() => {
      this.onScroll = () => {
        if (!this.visible || this.ticking) return;
        this.ticking = true;
        requestAnimationFrame(() => {
          this.update();
          this.ticking = false;
        });
      };
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.update();
    });
  }

  private update(): void {
    const node = this.el.nativeElement as HTMLElement;
    const rect = node.getBoundingClientRect();
    const centreOffset = rect.top + rect.height / 2 - window.innerHeight / 2;
    node.style.transform = `translate3d(0, ${(-centreOffset * this.appParallax()).toFixed(2)}px, 0)`;
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.onScroll) window.removeEventListener('scroll', this.onScroll);
  }
}
