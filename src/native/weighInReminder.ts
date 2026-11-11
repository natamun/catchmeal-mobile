import { Capacitor } from '@capacitor/core';
import { LocalNotifications, Weekday } from '@capacitor/local-notifications';

/** The only notification of the app. */
const REMINDER_ID = 1;

/** Whether the weekly weigh-in reminder is scheduled on this phone. */
export async function isReminderOn() {
  if (!Capacitor.isNativePlatform()) return false;
  const { notifications } = await LocalNotifications.getPending();
  return notifications.some((notification) => notification.id === REMINDER_ID);
}

/**
 * Schedules a notification every Sunday at 8:00, once allowed to notify.
 * The alarm is not exact, so Android never sends the user to its alarm
 * settings: Samsung delivers it within an hour after 8:00. Returns false when
 * notifications are refused.
 */
export async function enableReminder() {
  let { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') {
    ({ display } = await LocalNotifications.requestPermissions());
  }
  if (display !== 'granted') return false;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_ID,
        title: 'Pesée du dimanche',
        body: "C'est l'heure de la pesée.",
        schedule: {
          on: { weekday: Weekday.Sunday, hour: 8, minute: 0 },
          allowWhileIdle: true,
        },
        isExactNotification: false,
      },
    ],
  });
  return true;
}

/** Stops the weekly weigh-in reminder. */
export async function disableReminder() {
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
}
