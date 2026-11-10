import { describe, expect, it } from 'vitest';
import '../src/hru-card';

describe('smoke', () => {
  it('registers the hru-card element', () => {
    expect(customElements.get('hru-card')).toBeDefined();
  });

  it('renders without error', async () => {
    const el = document.createElement('hru-card');
    document.body.append(el);
    await el.updateComplete;
    expect(el.shadowRoot).not.toBeNull();
    el.remove();
  });
});
