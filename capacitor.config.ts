import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.natamun.catchmeal',
  appName: 'CatCHMeal',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      // The logo in white for the status bar, tinted in the app's green.
      smallIcon: 'ic_stat_catchmeal',
      iconColor: '#40916c',
    },
  },
};

export default config;
