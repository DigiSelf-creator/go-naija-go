import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../../capacitor.config';

// ST1c: the iPhone project cannot be built here (no Xcode), so these read its settings as text.
// The real build is .github/workflows/ios.yml on GitHub's Mac machines.
const root = join(__dirname, '..', '..');
const read = (p: string): string => readFileSync(join(root, p), 'utf8');
const plist = read('ios/App/App/Info.plist');
const project = read('ios/App/App.xcodeproj/project.pbxproj');

/** The values listed under one Info.plist key, e.g. the orientations. */
function plistArray(key: string): string[] {
  const m = new RegExp(`<key>${key}</key>\\s*<array>([\\s\\S]*?)</array>`).exec(plist);
  return m?.[1] ? [...m[1].matchAll(/<string>([^<]*)<\/string>/g)].map((x) => x[1] ?? '') : [];
}
function plistBool(key: string): boolean | null {
  const m = new RegExp(`<key>${key}</key>\\s*<(true|false)/>`).exec(plist);
  return m ? m[1] === 'true' : null;
}

describe('the iPhone sound kind (decision 22)', () => {
  it('the app uses the ambient kind, so the silent switch wins and own music mixes in', () => {
    const app = read('ios/App/App/AppDelegate.swift');
    expect(app).toMatch(/setCategory\(\.ambient/);
    expect(app).not.toMatch(/\.playback|\.playAndRecord|\.soloAmbient/);
  });
});

describe('the iPhone app settings (ST1c, ST0)', () => {
  it('keeps the saves address fixed (ST0 build note 1)', () => {
    expect(config.appId).toBe('com.coachnaz.gbese');
    expect(config.server?.iosScheme).toBe('capacitor');
    expect(config.server?.hostname).toBe('localhost');
    expect(config.server?.androidScheme).toBe('https');
    expect(config.server?.url).toBeUndefined();
  });

  it('is sideways only, both ways', () => {
    expect(plistArray('UISupportedInterfaceOrientations').sort()).toEqual(['UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight']);
    expect(plist).not.toContain('UISupportedInterfaceOrientations~ipad');
    expect(read('ios/App/App/GbeseViewController.swift')).toMatch(/supportedInterfaceOrientations[\s\S]*?return \.landscape/);
  });

  it('is for iPhone only, not iPad (decision 57)', () => {
    const families = [...project.matchAll(/TARGETED_DEVICE_FAMILY = ([^;]+);/g)].map((m) => m[1]);
    expect(families.length).toBeGreaterThan(0);
    for (const f of families) expect(f).toBe('1');
  });

  it('hides the top bar and lets the home bar fade in runs', () => {
    expect(plistBool('UIStatusBarHidden')).toBe(true);
    const vc = read('ios/App/App/GbeseViewController.swift');
    expect(vc).toMatch(/prefersStatusBarHidden: Bool \{\s*return true/);
    expect(vc).toMatch(/prefersHomeIndicatorAutoHidden: Bool \{\s*return inRun/);
    expect(vc).toMatch(/preferredScreenEdgesDeferringSystemGestures: UIRectEdge \{\s*return inRun \? \.bottom : \[\]/);
  });

  it('keeps the saves out of the phone backup (decision 59)', () => {
    const app = read('ios/App/App/AppDelegate.swift');
    expect(app).toContain('isExcludedFromBackup = true');
    expect(app).toContain('"WebKit"');
  });

  it('builds our own Swift files and uses our view controller', () => {
    for (const f of ['AppDelegate.swift', 'SceneDelegate.swift', 'GbeseViewController.swift', 'GbeseScreenPlugin.swift']) {
      expect(project).toContain(`/* ${f} in Sources */,`);
    }
    expect(read('ios/App/App/SceneDelegate.swift')).toContain('rootViewController = GbeseViewController()');
    const plugin = read('ios/App/App/GbeseScreenPlugin.swift');
    expect(plugin).toContain('jsName = "GbeseScreen"');
    expect(plugin).toContain('"setPlayMode"');
    expect(plugin).toContain('"getInsets"');
  });

  it('shows the name "Gbese!" under the icon (ST0 part 1)', () => {
    expect(plist).toMatch(/<key>CFBundleDisplayName<\/key>\s*<string>Gbese!<\/string>/);
  });

  it('uses the ST2 icon set and splash', () => {
    for (const set of ['AppIcon.appiconset', 'Splash.imageset']) {
      expect(read(`ios/App/App/Assets.xcassets/${set}/Contents.json`)).toBe(read(`app-assets/ios/${set}/Contents.json`));
    }
  });

  it('asks for no permissions (ST0 part 8)', () => {
    expect(plist).not.toMatch(/UsageDescription/);
  });
});
