import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kadal.shop',
  appName: 'Kadal Shop',
  webDir: 'dist',
  server: {
    url: 'https://e338c9be-34e9-40f2-81aa-f8388810f4c5.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;