import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.freshprep.app',
  appName: 'FreshPrep',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#1C1F28',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
