import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Motion } from './types';

type Target = keyof Motion;

const BASE_MS = 1000;
const TARGETS: readonly Target[] = ['supply', 'extract', 'spin'];

/** Rate for a 1 s base animation that should take `seconds` per cycle; 0 = paused. */
export function playbackRate(seconds: number | null): number {
  return seconds === null ? 0 : 1 / seconds;
}

function keyframes(el: Element, target: Target): Keyframe[] {
  if (target === 'spin') {
    return [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }];
  }
  const dir = el.getAttribute('data-dir');
  if (dir !== null) {
    const shift = dir === 'left' ? '-4px' : '4px';
    return [
      { transform: 'translateX(0)' },
      { transform: `translateX(${shift})` },
      { transform: 'translateX(0)' },
    ];
  }
  return [{ strokeDashoffset: '0' }, { strokeDashoffset: '-32' }];
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

interface Entry {
  animation: Animation;
  rate: number;
}

/**
 * Drives every `[data-motion]` element in a shadow root with one Web Animation each.
 * Speed changes adjust the playback rate in place, so motion never restarts.
 */
export class MotionController implements ReactiveController {
  private readonly entries = new Map<Element, Entry>();

  constructor(host: ReactiveControllerHost & HTMLElement) {
    host.addController(this);
  }

  sync(root: ShadowRoot, motion: Motion, enabled: boolean): void {
    const active = enabled && !reducedMotion();
    const seen = new Set<Element>();
    for (const target of TARGETS) {
      for (const el of root.querySelectorAll(`[data-motion="${target}"]`)) {
        seen.add(el);
        this.apply(el, target, active ? playbackRate(motion[target]) : 0);
      }
    }
    for (const [el, entry] of this.entries) {
      if (!seen.has(el)) {
        entry.animation.cancel();
        this.entries.delete(el);
      }
    }
  }

  hostDisconnected(): void {
    for (const entry of this.entries.values()) entry.animation.cancel();
    this.entries.clear();
  }

  private apply(el: Element, target: Target, rate: number): void {
    let entry = this.entries.get(el);
    if (!entry) {
      const animation = el.animate(keyframes(el, target), {
        duration: BASE_MS,
        iterations: Infinity,
      });
      // cancel() rejects `finished`; nothing awaits it, so keep it from surfacing as unhandled.
      animation.finished.catch(() => undefined);
      entry = { animation, rate: -1 };
      this.entries.set(el, entry);
    }
    if (rate === 0) {
      if (entry.rate !== 0) entry.animation.pause();
    } else {
      if (entry.rate !== rate) entry.animation.updatePlaybackRate(rate);
      if (entry.rate === 0) entry.animation.play();
    }
    entry.rate = rate;
  }
}
