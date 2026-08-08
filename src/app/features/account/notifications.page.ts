import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { AppNotification, NotificationKind } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { IconComponent, IconName } from '../../shared/components/ui/icon.component';
import { EmptyStateComponent } from '../../shared/components/ui/feedback.components';

const KIND_ICON: Record<NotificationKind, IconName> = {
  order: 'bag',
  reservation: 'calendar',
  inventory: 'box',
  review: 'star',
  system: 'settings',
  promotion: 'tag',
};

@Component({
  selector: 'app-account-notifications-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, EmptyStateComponent, TimeAgoPipe],
  template: `
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="font-display text-2xl">Notifications</h2>
        <p class="mt-1.5 text-sm text-ink-600">
          Order updates, booking confirmations and the occasional offer.
        </p>
      </div>
      @if (unreadCount() > 0) {
        <button type="button" class="btn btn-secondary btn-md" (click)="markAllRead()">
          <app-icon name="check" [size]="15" [strokeWidth]="2.4" />
          Mark all read ({{ unreadCount() }})
        </button>
      }
    </div>

    @if (notifications().length) {
      <ul class="mt-7 space-y-2.5">
        @for (item of notifications(); track item.id) {
          <li>
            <article
              class="panel flex items-start gap-4 p-5 transition-colors"
              [class]="item.isRead ? '' : 'border-clay-600/30 bg-clay-50/50'"
            >
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                [class]="toneClass(item.severity)"
              >
                <app-icon [name]="iconFor(item.kind)" [size]="17" />
              </span>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <p class="font-semibold text-ink-900">{{ item.title }}</p>
                  @if (!item.isRead) {
                    <span
                      class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-clay-600"
                      aria-label="Unread"
                    ></span>
                  }
                </div>
                <p class="mt-1 text-sm leading-relaxed text-ink-600">{{ item.body }}</p>
                <div class="mt-2.5 flex flex-wrap items-center gap-4">
                  <span class="text-caption text-ink-400">{{ item.createdAt | timeAgo }}</span>
                  @if (item.link) {
                    <a
                      [routerLink]="item.link"
                      class="text-caption font-semibold text-clay-700 hover:underline"
                      (click)="markRead(item)"
                      >Open</a
                    >
                  }
                  @if (!item.isRead) {
                    <button
                      type="button"
                      class="text-caption text-ink-500 hover:text-ink-900"
                      (click)="markRead(item)"
                    >
                      Mark as read
                    </button>
                  }
                </div>
              </div>
            </article>
          </li>
        }
      </ul>
    } @else {
      <app-empty-state
        class="mt-7"
        icon="bell"
        title="Nothing to report"
        message="Order updates and booking confirmations will appear here."
      />
    }
  `,
})
export class AccountNotificationsPage {
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  private readonly reload = signal(0);

  protected readonly notifications = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.content.notifications())),
    { initialValue: [] as AppNotification[] },
  );

  protected readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.isRead).length,
  );

  constructor() {
    this.seo.apply({
      title: 'Notifications | Salateen Restaurant Swabi',
      description: 'Your order and booking notifications.',
      path: 'account/notifications',
      noIndex: true,
    });
  }

  protected iconFor(kind: NotificationKind): IconName {
    return KIND_ICON[kind] ?? 'bell';
  }

  protected toneClass(severity: AppNotification['severity']): string {
    return {
      info: 'border-basil-600/25 bg-basil-50 text-basil-700',
      success: 'border-emerald-600/25 bg-emerald-50 text-emerald-700',
      warning: 'border-amber-500/30 bg-amber-50 text-amber-700',
      danger: 'border-red-500/25 bg-red-50 text-red-700',
    }[severity];
  }

  protected markRead(item: AppNotification): void {
    if (item.isRead) return;
    this.content.markNotificationRead(item.id).subscribe(() => this.reload.update((n) => n + 1));
  }

  protected markAllRead(): void {
    const unread = this.notifications().filter((n) => !n.isRead);
    if (!unread.length) return;
    let done = 0;
    for (const item of unread) {
      this.content.markNotificationRead(item.id).subscribe({
        next: () => {
          done++;
          if (done === unread.length) {
            this.reload.update((n) => n + 1);
            this.toast.success('All caught up');
          }
        },
        error: () => this.reload.update((n) => n + 1),
      });
    }
  }
}
