/**
 * Shared colours for every Gidi Dash drawing. Bright, warm, drawn 2D.
 * Hero and hazards use strong, darker outlines (INK) so they stand out from the
 * softer, paler background colours.
 */
export const INK = '#1d1a14';
export const WHITE = '#ffffff';
export const CREAM = '#fff8e6';

export const SKY_TOP = '#6fc2f0';
export const SKY_LOW = '#fbe6b4';
export const SUN = '#ffd34d';
export const SUN_RING = '#ffe9a0';
export const CLOUD = '#ffffff';

/** Far skyline: pale and low contrast, so it never fights the hero. */
export const SKYLINE = '#a9c3cf';
export const SKYLINE_DARK = '#93aebb';
export const SKYLINE_WINDOW = '#c9dde6';

/** Shop walls, warm and a little faded so the road layer reads first. */
export const SHOP_WALLS = ['#f0a35e', '#7fc4a4', '#f2d06b', '#e58b8b', '#9fb6e8', '#e7b98a', '#b7d77a', '#d7a6d9'] as const;
export const SHOP_SHADE = 'rgba(0,0,0,0.16)';
export const SHOP_DOOR = '#5b4636';
export const SHOP_GLASS = '#cfe9f5';
export const SIGN_BOARD = '#fff8e6';

export const BUS_YELLOW = '#f6c90e';
export const BUS_STRIPE = '#1d1a14';
export const BUS_GLASS = '#bfe3f5';
export const TYRE_BLACK = '#222222';

export const ROAD = '#3e3e42';
export const ROAD_EDGE = '#d8c27a';
export const ROAD_LINE = '#f4f1e6';
export const POTHOLE = '#2a1f17';
export const POTHOLE_RIM = '#5c4a38';
export const POTHOLE_WATER = '#5f8c92';

export const STALL_ROOF = '#c8641e';
export const STALL_ROOF_STRIPE = '#f3dca2';
export const STALL_POLE = '#6b4a2b';
export const STALL_TABLE = '#8a5d36';

export const STOP_POLE = '#5d6670';
export const STOP_SIGN_OFF = '#c0392b';
export const STOP_SIGN_ON = '#22a85a';

export const GOAT_COAT = '#f3eee3';
export const GOAT_PATCH = '#9a7b5a';
export const GOAT_HORN = '#8a7f70';
export const GOAT_HOOF = '#4a3f35';

export const KOBO = '#f2b300';
export const KOBO_DARK = '#a87900';
export const KOBO_SHINE = '#fff1b8';

export const GREEN_GO = '#22c55e';
export const GREEN_GO_DARK = '#13703a';
export const LIGHT_RED = '#e74c3c';
export const LIGHT_AMBER = '#f1c40f';
export const LIGHT_OFF = '#4a4a4a';
/** The small tick on a used (dark) go light. */
export const TICK_GREY = '#8a9099';
export const LIGHT_BOX = '#2b2f36';

export const GLOW = '#ffd84d';
export const SHIELD = '#7fd6ff';
export const SPARKLE = '#fff6c2';

/** Car colours for the jam (no taxi or brand liveries, just plain bright paint). */
export const CAR_COLOURS = ['#e0572b', '#2b59c3', '#2fa36b', '#9b59b6', '#f39c12', '#16a3b8', '#d63d6c'] as const;
