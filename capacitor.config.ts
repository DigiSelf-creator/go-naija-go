import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The store app (ST1a, decisions 51, 54, 59; docs/design.md ST0). `npm run app:sync` builds the
 * game into dist (`vite build --mode app`) and copies it inside the app: the app never fetches
 * the game from the web, and plays offline from the very first start. There is no `server.url`.
 */
const config: CapacitorConfig = {
  // Decision 54: never changes after the first upload.
  appId: 'com.coachnaz.gbese',
  appName: 'Gbese!',
  webDir: 'dist',
  // SAVES: NEVER CHANGE THESE TWO. The page runs at https://localhost inside the app, and its
  // localStorage (the hero, Lagos, every save) belongs to exactly that address. A different
  // scheme or host in a later version would show every player an empty game after the update
  // (ST0 build note 1). They are written out here so a new Capacitor default cannot move them.
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    iosScheme: 'capacitor',
  },
  backgroundColor: '#0f1a12',
  android: {
    allowMixedContent: false,
    captureInput: false,
    // webContentsDebuggingEnabled is left at Capacitor's default: debug builds can be inspected
    // from a computer (chrome://inspect), release builds cannot.
  },
  plugins: {
    // ST0 part 6: the splash stays until the first screen has drawn; src/native/app.ts hides it.
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0f1a12',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    // ST0 part 4: MainActivity draws edge to edge and hides the bars; GbeseScreenPlugin reads the
    // real safe edges. Capacitor's own bar handling would pad the picture, so it is off.
    SystemBars: {
      insetsHandling: 'disable',
      hidden: true,
    },
  },
};

export default config;
