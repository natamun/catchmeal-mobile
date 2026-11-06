import type { ScheduleOptions } from '@capacitor/local-notifications';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  disableReminder,
  enableReminder,
  isReminderOn,
} from './weighInReminder';

const { plugin, isNativePlatform } = vi.hoisted(() => ({
  plugin: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    schedule: vi.fn(),
    cancel: vi.fn(),
    getPending: vi.fn(),
  },
  isNativePlatform: vi.fn(),
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: plugin,
  Weekday: { Sunday: 1 },
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform } }));

beforeEach(() => {
  vi.clearAllMocks();
  isNativePlatform.mockReturnValue(true);
  plugin.checkPermissions.mockResolvedValue({ display: 'granted' });
});

/** The notification given to the last schedule() call. */
const scheduled = () =>
  (plugin.schedule.mock.lastCall as [ScheduleOptions])[0].notifications[0];

describe('enableReminder', () => {
  it('schedules a notification every Sunday at 8:00', async () => {
    expect(await enableReminder()).toBe(true);
    expect(scheduled().schedule?.on).toEqual({
      weekday: 1,
      hour: 8,
      minute: 0,
    });
    expect(plugin.requestPermissions).not.toHaveBeenCalled();
  });

  it('never asks for an exact alarm', async () => {
    await enableReminder();
    expect(scheduled().isExactNotification).toBe(false);
  });

  it('asks for the right to notify first when not granted yet', async () => {
    plugin.checkPermissions.mockResolvedValue({ display: 'prompt' });
    plugin.requestPermissions.mockResolvedValue({ display: 'granted' });
    expect(await enableReminder()).toBe(true);
    expect(plugin.schedule).toHaveBeenCalledOnce();
  });

  it('schedules nothing when notifications are refused', async () => {
    plugin.checkPermissions.mockResolvedValue({ display: 'prompt' });
    plugin.requestPermissions.mockResolvedValue({ display: 'denied' });
    expect(await enableReminder()).toBe(false);
    expect(plugin.schedule).not.toHaveBeenCalled();
  });
});

describe('disableReminder', () => {
  it('cancels the scheduled reminder', async () => {
    await enableReminder();
    await disableReminder();
    expect(plugin.cancel).toHaveBeenCalledWith({
      notifications: [{ id: scheduled().id }],
    });
  });
});

describe('isReminderOn', () => {
  it('reads whether Android has the reminder scheduled', async () => {
    plugin.getPending.mockResolvedValue({ notifications: [{ id: 1 }] });
    expect(await isReminderOn()).toBe(true);
    plugin.getPending.mockResolvedValue({ notifications: [] });
    expect(await isReminderOn()).toBe(false);
  });

  it('is off outside the phone, without asking anything', async () => {
    isNativePlatform.mockReturnValue(false);
    expect(await isReminderOn()).toBe(false);
    expect(plugin.getPending).not.toHaveBeenCalled();
  });
});
