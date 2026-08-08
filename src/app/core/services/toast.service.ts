import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  action?: { label: string; run: () => void };
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts = signal<Toast[]>([]);

  success(title: string, message?: string) {
    return this.push('success', title, message);
  }
  error(title: string, message?: string) {
    return this.push('error', title, message, 7000);
  }
  info(title: string, message?: string) {
    return this.push('info', title, message);
  }
  warning(title: string, message?: string) {
    return this.push('warning', title, message, 6000);
  }

  push(
    tone: ToastTone,
    title: string,
    message?: string,
    durationMs = 4500,
    action?: Toast['action'],
  ): number {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, tone, title, message, action, durationMs }]);
    // Toasts stack, so cap the visible queue rather than letting it grow.
    if (this.toasts().length > 4) this.dismiss(this.toasts()[0].id);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), durationMs),
    );
    return id;
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.toasts.set([]);
  }
}
