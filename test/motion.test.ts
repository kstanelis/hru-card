import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { MotionController, playbackRate } from '../src/motion';
import type { Motion } from '../src/types';

interface FakeAnimation {
  updatePlaybackRate: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
}

let created: {
  el: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  anim: FakeAnimation;
}[];
const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');

function fakeAnimate(this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  const anim: FakeAnimation = {
    updatePlaybackRate: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    cancel: vi.fn(),
  };
  created.push({ el: this, keyframes, options, anim });
  return anim as unknown as Animation;
}

function setup(): { ctrl: MotionController; root: ShadowRoot; controllers: ReactiveController[] } {
  const controllers: ReactiveController[] = [];
  const host = document.createElement('div') as unknown as ReactiveControllerHost & HTMLElement;
  host.addController = (c: ReactiveController) => controllers.push(c);
  const root = document.createElement('div').attachShadow({ mode: 'open' });
  root.innerHTML = `
    <ha-icon data-motion="spin"></ha-icon>
    <path data-motion="supply"></path>
    <path data-motion="extract"></path>
    <span data-motion="supply" data-dir="right"></span>
    <span data-motion="extract" data-dir="left"></span>`;
  return { ctrl: new MotionController(host), root, controllers };
}

const motion = (over: Partial<Motion> = {}): Motion => ({
  supply: 1,
  extract: 2,
  spin: 2.4,
  ...over,
});

function animOf(root: ShadowRoot, selector: string): FakeAnimation {
  const el = root.querySelector(selector);
  const found = created.find((c) => c.el === el);
  if (!found) throw new Error(`no animation for ${selector}`);
  return found.anim;
}

beforeEach(() => {
  created = [];
  Object.defineProperty(Element.prototype, 'animate', { value: fakeAnimate, configurable: true });
});

afterEach(() => {
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate);
  else Reflect.deleteProperty(Element.prototype, 'animate');
  vi.unstubAllGlobals();
});

describe('playbackRate', () => {
  it('converts seconds per cycle into a rate for a 1 s base animation', () => {
    expect(playbackRate(0.4)).toBe(2.5);
    expect(playbackRate(null)).toBe(0);
  });
});

describe('MotionController', () => {
  it('registers itself with the host', () => {
    const { ctrl, controllers } = setup();
    expect(controllers).toEqual([ctrl]);
  });

  it('creates one animation per motion target and reuses it across syncs', () => {
    const { ctrl, root } = setup();
    ctrl.sync(root, motion(), true);
    ctrl.sync(root, motion(), true);
    expect(created).toHaveLength(5);
    for (const c of created) {
      expect(c.options).toMatchObject({ duration: 1000, iterations: Infinity });
    }
  });

  it('uses spin, flow and arrow keyframes', () => {
    const { ctrl, root } = setup();
    ctrl.sync(root, motion(), true);
    const kf = (sel: string) => created.find((c) => c.el === root.querySelector(sel))?.keyframes;
    expect(kf('[data-motion="spin"]')).toEqual([
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(360deg)' },
    ]);
    expect(kf('path[data-motion="supply"]')).toEqual([
      { strokeDashoffset: '0' },
      { strokeDashoffset: '-32' },
    ]);
    expect(kf('span[data-dir="right"]')).toEqual([
      { transform: 'translateX(0)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(0)' },
    ]);
    expect(kf('span[data-dir="left"]')).toEqual([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(0)' },
    ]);
  });

  it('sets the rate from each target seconds', () => {
    const { ctrl, root } = setup();
    ctrl.sync(root, motion(), true);
    expect(animOf(root, '[data-motion="spin"]').updatePlaybackRate).toHaveBeenCalledWith(1 / 2.4);
    expect(animOf(root, 'path[data-motion="supply"]').updatePlaybackRate).toHaveBeenCalledWith(1);
    expect(animOf(root, 'path[data-motion="extract"]').updatePlaybackRate).toHaveBeenCalledWith(
      0.5,
    );
  });

  it('updates playback rate smoothly on speed change', () => {
    const { ctrl, root } = setup();
    ctrl.sync(root, motion(), true);
    ctrl.sync(root, motion({ supply: 0.6 }), true);
    expect(created).toHaveLength(5);
    const supply = animOf(root, 'path[data-motion="supply"]');
    expect(supply.updatePlaybackRate).toHaveBeenLastCalledWith(1 / 0.6);
    expect(supply.cancel).not.toHaveBeenCalled();
  });

  it('pauses when seconds null', () => {
    const { ctrl, root } = setup();
    ctrl.sync(root, motion({ extract: null }), true);
    expect(animOf(root, 'path[data-motion="extract"]').pause).toHaveBeenCalled();
    expect(animOf(root, 'path[data-motion="supply"]').pause).not.toHaveBeenCalled();
  });

  it('resumes after a pause', () => {
    const { ctrl, root } = setup();
    ctrl.sync(root, motion({ spin: null }), true);
    ctrl.sync(root, motion(), true);
    expect(animOf(root, '[data-motion="spin"]').play).toHaveBeenCalled();
  });

  it('pauses all when disabled', () => {
    const { ctrl, root } = setup();
    ctrl.sync(root, motion(), false);
    expect(created.every((c) => c.anim.pause.mock.calls.length > 0)).toBe(true);
  });

  it('pauses under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }));
    const { ctrl, root } = setup();
    ctrl.sync(root, motion(), true);
    expect(created.every((c) => c.anim.pause.mock.calls.length > 0)).toBe(true);
  });

  it('cancels animations of targets removed from the DOM', () => {
    const { ctrl, root } = setup();
    ctrl.sync(root, motion(), true);
    const spin = animOf(root, '[data-motion="spin"]');
    root.querySelector('[data-motion="spin"]')?.remove();
    ctrl.sync(root, motion(), true);
    expect(spin.cancel).toHaveBeenCalled();
  });

  it('cancels animations on hostDisconnected', () => {
    const { ctrl, root } = setup();
    ctrl.sync(root, motion(), true);
    ctrl.hostDisconnected();
    expect(created.every((c) => c.anim.cancel.mock.calls.length === 1)).toBe(true);
    ctrl.sync(root, motion(), true);
    expect(created).toHaveLength(10);
  });
});
