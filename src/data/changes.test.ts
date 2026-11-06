import { describe, expect, it, vi } from 'vitest';

import {
  changing,
  getDataVersion,
  notifyDataChanged,
  subscribeToDataChanges,
} from './changes';

describe('data changes', () => {
  it('tells the listeners and raises the version', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToDataChanges(listener);
    const before = getDataVersion();

    notifyDataChanged();

    expect(listener).toHaveBeenCalledOnce();
    expect(getDataVersion()).toBe(before + 1);
    unsubscribe();
  });

  it('signals a write once it succeeded', async () => {
    const before = getDataVersion();

    expect(await changing(Promise.resolve('saved'))).toBe('saved');
    expect(getDataVersion()).toBe(before + 1);
  });

  it('signals nothing when the write fails', async () => {
    const before = getDataVersion();

    await expect(
      changing(Promise.reject(new Error('refused'))),
    ).rejects.toThrow('refused');
    expect(getDataVersion()).toBe(before);
  });
});
