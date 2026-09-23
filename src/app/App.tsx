import { useState, useRef, useEffect } from 'react';
import './App.css';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

type Role = 'primary' | 'secondary' | 'accent' | 'background' | 'text';

interface ColorToken { hex: string; name: string; role: Role; }

interface Song {
  songName: string; artist: string; era: string; genre: string;
  mood: string; tempo: string; palette: ColorToken[];
  moodDimensions: Array<{ label: string; value: number }>;
  typography: {
    displayFont: string; displayWhy: string;
    bodyFont: string; bodyWhy: string;
    specimenHeading: string; specimenBody: string;
  };
  uiCard: {
    headline: string; subtext: string; ctaLabel: string;
    bgColor: string; textColor: string; accentColor: string;
  };
  designRationale: string;
  lyricsSnippet: string | null;
}

interface iTunesResult { artworkUrl100?: string; previewUrl?: string; primaryGenreName?: string; artistName?: string; trackName?: string; collectionName?: string; }

/* ─────────────────────────────────────────────────────────────────────────────
   GENERATOR (hash-seeded, no API key needed)
───────────────────────────────────────────────────────────────────────────── */

function strHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h >>> 0);
}
function pick<T>(arr: T[], seed: number, offset: number): T {
  return arr[Math.abs((seed ^ (seed >> 13)) + offset * 6571) % arr.length];
}
function seeded(seed: number, n: number): number {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return Math.abs(x - Math.floor(x));
}


function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function hexToRgb(hex: string) {
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}
function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
function mixHex(a: string, b: string, amount: number) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return rgbToHex(ca.r + (cb.r - ca.r) * amount, ca.g + (cb.g - ca.g) * amount, ca.b + (cb.b - ca.b) * amount);
}
function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function saturationOf(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
  return max === 0 ? 0 : (max - min) / max;
}
function colorDistance(a: string, b: string) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return Math.hypot(ca.r - cb.r, ca.g - cb.g, ca.b - cb.b);
}
function rgbToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: h * 360, s, l };
}
function hslToHex(h: number, s: number, l: number) {
  const hue = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let tc = t;
    if (tc < 0) tc += 1;
    if (tc > 1) tc -= 1;
    if (tc < 1 / 6) return p + (q - p) * 6 * tc;
    if (tc < 1 / 2) return q;
    if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6;
    return p;
  };
  return rgbToHex(channel(hue + 1 / 3) * 255, channel(hue) * 255, channel(hue - 1 / 3) * 255);
}
function tuneHex(hex: string, hash: number, offset: number, role: Role) {
  const hsl = rgbToHsl(hex);
  const hueDrift = (seeded(hash, offset) - 0.5) * (role === 'background' || role === 'text' ? 14 : 34);
  const satLift = (seeded(hash, offset + 20) - 0.45) * (role === 'secondary' ? 0.18 : 0.26);
  const lightLift = (seeded(hash, offset + 40) - 0.5) * (role === 'background' ? 0.16 : role === 'text' ? 0.08 : 0.20);
  return hslToHex(hsl.h + hueDrift, clamp(hsl.s + satLift, 0.08, 0.9), clamp(hsl.l + lightLift, role === 'text' ? 0.1 : 0.05, role === 'background' ? 0.92 : 0.86));
}
function personalizeFallbackPalette(base: ColorToken[], input: string, hash: number): ColorToken[] {
  const source = input.split(/\s*[–—\-]\s*/)[0]?.trim().split(/\s+/)[0] || 'Song';
  const tuned = base.map((color, i) => ({ ...color, hex: tuneHex(color.hex, hash, i + 3, color.role) }));
  const bg = tuned.find(c => c.role === 'background');
  const primary = tuned.find(c => c.role === 'primary');
  const accent = tuned.find(c => c.role === 'accent');
  const secondary = tuned.find(c => c.role === 'secondary');
  const textHex = readableTextFor(bg?.hex ?? '#111111');
  const repaired: ColorToken[] = [
    { ...(bg ?? tuned[0]), role: 'background', name: colorName(bg?.hex ?? tuned[0].hex, 'background', source) },
    { ...(primary ?? tuned[1]), role: 'primary', name: colorName(primary?.hex ?? tuned[1].hex, 'primary', source) },
    { ...(accent ?? tuned[2]), role: 'accent', name: colorName(accent?.hex ?? tuned[2].hex, 'accent', source) },
    { ...(secondary ?? tuned[3]), role: 'secondary', name: colorName(secondary?.hex ?? tuned[3].hex, 'secondary', source) },
    { hex: textHex, role: 'text', name: colorName(textHex, 'text', source) },
  ];
  return repaired;
}
function readableTextFor(bg: string) { return relativeLuminance(bg) > 0.42 ? mixHex(bg, '#050505', 0.86) : mixHex(bg, '#FFFFFF', 0.92); }
const NAMED_COLORS: Array<{ name: string; hex: string }> = [
  { name: 'Black', hex: '#000000' }, { name: 'White', hex: '#FFFFFF' }, { name: 'Ivory', hex: '#FFFFF0' },
  { name: 'Cream', hex: '#FFFDD0' }, { name: 'Beige', hex: '#F5F5DC' }, { name: 'Linen', hex: '#FAF0E6' },
  { name: 'Tan', hex: '#D2B48C' }, { name: 'Khaki', hex: '#C3B091' }, { name: 'Taupe', hex: '#483C32' },
  { name: 'Brown', hex: '#8B4513' }, { name: 'Chocolate', hex: '#7B3F00' }, { name: 'Mahogany', hex: '#4A0100' },
  { name: 'Charcoal', hex: '#36454F' }, { name: 'Slate Gray', hex: '#708090' }, { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Gray', hex: '#808080' }, { name: 'Ash Gray', hex: '#B2BEB5' }, { name: 'Smoke', hex: '#738276' },
  { name: 'Red', hex: '#FF0000' }, { name: 'Crimson', hex: '#DC143C' }, { name: 'Scarlet', hex: '#FF2400' },
  { name: 'Burgundy', hex: '#800020' }, { name: 'Maroon', hex: '#800000' }, { name: 'Rose', hex: '#FF007F' },
  { name: 'Pink', hex: '#FFC0CB' }, { name: 'Blush', hex: '#DE5D83' }, { name: 'Coral', hex: '#FF7F50' },
  { name: 'Salmon', hex: '#FA8072' }, { name: 'Peach', hex: '#FFE5B4' }, { name: 'Orange', hex: '#FFA500' },
  { name: 'Amber', hex: '#FFBF00' }, { name: 'Gold', hex: '#FFD700' }, { name: 'Mustard', hex: '#FFDB58' },
  { name: 'Yellow', hex: '#FFFF00' }, { name: 'Lemon', hex: '#FFF700' }, { name: 'Olive', hex: '#808000' },
  { name: 'Chartreuse', hex: '#7FFF00' }, { name: 'Lime', hex: '#00FF00' }, { name: 'Green', hex: '#008000' },
  { name: 'Emerald', hex: '#50C878' }, { name: 'Forest Green', hex: '#228B22' }, { name: 'Moss Green', hex: '#8A9A5B' },
  { name: 'Sage', hex: '#9CAF88' }, { name: 'Mint', hex: '#98FF98' }, { name: 'Seafoam', hex: '#9FE2BF' },
  { name: 'Teal', hex: '#008080' }, { name: 'Turquoise', hex: '#40E0D0' }, { name: 'Cyan', hex: '#00FFFF' },
  { name: 'Aqua', hex: '#00FFFF' }, { name: 'Sky Blue', hex: '#87CEEB' }, { name: 'Powder Blue', hex: '#B0E0E6' },
  { name: 'Periwinkle', hex: '#CCCCFF' }, { name: 'Blue', hex: '#0000FF' }, { name: 'Royal Blue', hex: '#4169E1' },
  { name: 'Cobalt', hex: '#0047AB' }, { name: 'Navy', hex: '#000080' }, { name: 'Indigo', hex: '#4B0082' },
  { name: 'Violet', hex: '#8F00FF' }, { name: 'Purple', hex: '#800080' }, { name: 'Lavender', hex: '#E6E6FA' },
  { name: 'Lilac', hex: '#C8A2C8' }, { name: 'Mauve', hex: '#E0B0FF' }, { name: 'Magenta', hex: '#FF00FF' },
  { name: 'Fuchsia', hex: '#FF00FF' }, { name: 'Plum', hex: '#673147' }
];

function colorName(hex: string, _role: Role, _source: string) {
  let nearest = NAMED_COLORS[0];
  let best = Number.POSITIVE_INFINITY;
  for (const named of NAMED_COLORS) {
    const distance = colorDistance(hex, named.hex);
    if (distance < best) { best = distance; nearest = named; }
  }
  return nearest.name;
}

function buildArtworkPalette(swatches: string[], input: string, hash: number): ColorToken[] {
  const source = input.split(/\s*[–—\-]\s*/)[0]?.trim().split(/\s+/)[0] || 'Album';
  const unique = swatches.filter((c, i, arr) => arr.findIndex(x => colorDistance(x, c) < 26) === i);
  const darks = unique.filter(c => relativeLuminance(c) < 0.34).sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
  const lights = unique.filter(c => relativeLuminance(c) > 0.56).sort((a, b) => relativeLuminance(b) - relativeLuminance(a));
  const colorful = unique.filter(c => saturationOf(c) > 0.18).sort((a, b) => (saturationOf(b) * 1.2 + Math.abs(relativeLuminance(b) - 0.48)) - (saturationOf(a) * 1.2 + Math.abs(relativeLuminance(a) - 0.48)));
  const primary = colorful[0] ?? unique[hash % unique.length] ?? PALETTES[detectPaletteIndex(input, hash)].colors.find(c => c.role === 'primary')!.hex;
  const accent = colorful.find(c => colorDistance(c, primary) > 70) ?? mixHex(primary, lights[0] ?? '#FFFFFF', 0.38);
  const secondary = unique.find(c => colorDistance(c, primary) > 34 && colorDistance(c, accent) > 34 && relativeLuminance(c) > 0.25 && relativeLuminance(c) < 0.78) ?? mixHex(primary, accent, 0.5);
  const background = (relativeLuminance(primary) < 0.28 ? (darks[0] ?? mixHex(primary, '#000000', 0.62)) : (lights[0] ?? mixHex(primary, '#FFFFFF', 0.76)));
  const text = readableTextFor(background);
  const roles: Array<[Role, string]> = [['background', background], ['primary', primary], ['accent', accent], ['secondary', secondary], ['text', text]];
  return roles.map(([role, hex]) => ({ hex, role, name: colorName(hex, role, source) }));
}
async function extractArtworkPalette(artwork: string | null, input: string, hash: number): Promise<ColorToken[] | null> {
  if (!artwork) return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = artwork;
    });
    await loaded;
    const canvas = document.createElement('canvas');
    const size = 80;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const buckets = new Map<string, { r: number; g: number; b: number; count: number; score: number }>();
    for (let i = 0; i < data.length; i += 16) {
      const a = data[i + 3]; if (a < 180) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (lum > 0.965 || lum < 0.025) continue;
      const key = `${Math.round(r / 24) * 24},${Math.round(g / 24) * 24},${Math.round(b / 24) * 24}`;
      const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
      const existing = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0, score: 0 };
      existing.r += r; existing.g += g; existing.b += b; existing.count += 1;
      existing.score += 1 + sat * 2.2 + (1 - Math.abs(lum - 0.48)) * 0.8;
      buckets.set(key, existing);
    }
    const swatches = [...buckets.values()].sort((a, b) => b.score - a.score).slice(0, 14).map(c => rgbToHex(c.r / c.count, c.g / c.count, c.b / c.count));
    return swatches.length >= 3 ? buildArtworkPalette(swatches, input, hash) : null;
  } catch { return null; }
}

interface PaletteSet { colors: ColorToken[] }
const PALETTES: PaletteSet[] = [
  { colors: [{ hex: '#1C0F2E', name: 'Midnight Abyss', role: 'background' }, { hex: '#7C3AED', name: 'Electric Violet', role: 'primary' }, { hex: '#EC4899', name: 'Neon Flush', role: 'accent' }, { hex: '#C4B5FD', name: 'Haze Lilac', role: 'secondary' }, { hex: '#F5F3FF', name: 'Ghost White', role: 'text' }] },
  { colors: [{ hex: '#0C1E2E', name: 'Deep Current', role: 'background' }, { hex: '#0EA5E9', name: 'Electric Tide', role: 'primary' }, { hex: '#38BDF8', name: 'Arctic Blue', role: 'accent' }, { hex: '#BAE6FD', name: 'Morning Reef', role: 'secondary' }, { hex: '#F0F9FF', name: 'Sea Foam', role: 'text' }] },
  { colors: [{ hex: '#FFF7ED', name: 'Harvest Cream', role: 'background' }, { hex: '#EA580C', name: 'Ember Glow', role: 'primary' }, { hex: '#F59E0B', name: 'Liquid Gold', role: 'accent' }, { hex: '#FED7AA', name: 'Peach Silk', role: 'secondary' }, { hex: '#431407', name: 'Warm Mahogany', role: 'text' }] },
  { colors: [{ hex: '#0A0A0A', name: 'Carbon Black', role: 'background' }, { hex: '#D4D4D4', name: 'Chrome Dust', role: 'primary' }, { hex: '#E5E5E5', name: 'Bright Flash', role: 'accent' }, { hex: '#525252', name: 'Steel Fog', role: 'secondary' }, { hex: '#FAFAFA', name: 'Pure White', role: 'text' }] },
  { colors: [{ hex: '#0D1A0D', name: 'Forest Dark', role: 'background' }, { hex: '#16A34A', name: 'Fern Green', role: 'primary' }, { hex: '#4ADE80', name: 'Leaf Light', role: 'accent' }, { hex: '#86EFAC', name: 'Pale Moss', role: 'secondary' }, { hex: '#F0FDF4', name: 'Morning Mist', role: 'text' }] },
  { colors: [{ hex: '#FFF1F2', name: 'Petal Cloud', role: 'background' }, { hex: '#E11D48', name: 'Crimson Burst', role: 'primary' }, { hex: '#FB7185', name: 'Blush Fade', role: 'accent' }, { hex: '#FECDD3', name: 'Rose Haze', role: 'secondary' }, { hex: '#881337', name: 'Deep Rose', role: 'text' }] },
  { colors: [{ hex: '#1C1107', name: 'Bourbon Dark', role: 'background' }, { hex: '#D97706', name: 'Amber Flame', role: 'primary' }, { hex: '#FCD34D', name: 'Brass Shine', role: 'accent' }, { hex: '#FDE68A', name: 'Honey Light', role: 'secondary' }, { hex: '#FFFBEB', name: 'Candlelight', role: 'text' }] },
  { colors: [{ hex: '#0F172A', name: 'Storm Front', role: 'background' }, { hex: '#6366F1', name: 'Lightning Indigo', role: 'primary' }, { hex: '#A78BFA', name: 'Purple Flash', role: 'accent' }, { hex: '#818CF8', name: 'Violet Haze', role: 'secondary' }, { hex: '#EEF2FF', name: 'Cloud Break', role: 'text' }] },
  { colors: [{ hex: '#F8FAFC', name: 'Polar White', role: 'background' }, { hex: '#0369A1', name: 'Arctic Depth', role: 'primary' }, { hex: '#7DD3FC', name: 'Ice Crystal', role: 'accent' }, { hex: '#BAE6FD', name: 'Frost Breath', role: 'secondary' }, { hex: '#0C4A6E', name: 'Deep Ice', role: 'text' }] },
  { colors: [{ hex: '#05001A', name: 'City Night', role: 'background' }, { hex: '#FF006E', name: 'Neon Magenta', role: 'primary' }, { hex: '#00F5FF', name: 'Electric Cyan', role: 'accent' }, { hex: '#3D0087', name: 'Deep Ultraviolet', role: 'secondary' }, { hex: '#F5F5F5', name: 'Holo White', role: 'text' }] },
  { colors: [{ hex: '#FAF5FF', name: 'Whisper Lavender', role: 'background' }, { hex: '#7C3AED', name: 'Bloom Purple', role: 'primary' }, { hex: '#A78BFA', name: 'Wisteria', role: 'accent' }, { hex: '#EDE9FE', name: 'Petal Mist', role: 'secondary' }, { hex: '#2E1065', name: 'Twilight Deep', role: 'text' }] },
  { colors: [{ hex: '#F5F0E8', name: 'Aged Paper', role: 'background' }, { hex: '#4A3728', name: 'Dark Oak', role: 'primary' }, { hex: '#C5A882', name: 'Warm Tan', role: 'accent' }, { hex: '#8B7355', name: 'Walnut', role: 'secondary' }, { hex: '#2A1F14', name: 'Ink Black', role: 'text' }] },
];

interface FontPair { display: string; body: string; dWhy: string; bWhy: string; }
const FONT_PAIRS: FontPair[] = [
  { display: 'Playfair Display', body: 'Lato', dWhy: 'Dramatic serifs carry the weight of deep emotional resonance.', bWhy: 'Clean strokes ground dreamy excess in readable warmth.' },
  { display: 'Space Grotesk', body: 'Inter', dWhy: 'Geometric precision mirrors the song\'s careful structural architecture.', bWhy: 'Neutral clarity lets the palette carry the emotional load.' },
  { display: 'Fraunces', body: 'DM Sans', dWhy: 'Its optical swash creates the same beautiful distortion as the track itself.', bWhy: 'Humanist forms add warmth beneath the heavy display weight.' },
  { display: 'Libre Baskerville', body: 'Source Sans 3', dWhy: 'Old-world authority grounds a sound built on classical harmonic tension.', bWhy: 'Generous x-height holds intimate detail in long listening notes.' },
  { display: 'Cormorant Garamond', body: 'Mulish', dWhy: 'Elongated strokes match the song\'s sense of restrained, exquisite longing.', bWhy: 'Even spacing suits the calm precision of music metadata.' },
  { display: 'Bebas Neue', body: 'Montserrat', dWhy: 'Condensed brutality amplifies the track\'s relentless, driving momentum.', bWhy: 'Consistent weight creates the visual pulse of steady repetition.' },
  { display: 'DM Serif Display', body: 'Work Sans', dWhy: 'Organic inktraps add tactile texture mirroring the song\'s raw grain.', bWhy: 'Clean construction balances the display\'s expressive irregularity.' },
  { display: 'Syne', body: 'Nunito', dWhy: 'Variable-weight experimentation mirrors the track\'s genre-defying instability.', bWhy: 'Soft terminals soften the intensity carried by the heavy display type.' },
  { display: 'Unbounded', body: 'IBM Plex Sans', dWhy: 'The maximalist weight signals a sound that refuses to stay in its lane.', bWhy: 'Technical clarity suits the information-dense structure of design tokens.' },
  { display: 'Lora', body: 'Open Sans', dWhy: 'Its calligraphic roots echo the song\'s connection to the handmade and personal.', bWhy: 'A neutral foil that never distracts from content-rich listening contexts.' },
  { display: 'Josefin Sans', body: 'Raleway', dWhy: 'Art Deco angularity captures the retro-futurist tension at the heart of this sound.', bWhy: 'Elegant thin letterforms suit the airy, melodic spaces between beats.' },
  { display: 'Cinzel', body: 'Lato', dWhy: 'Roman grandeur makes the emotional stakes feel enormous and utterly inevitable.', bWhy: 'The humanist body voice keeps the experience grounded and quietly accessible.' },
];

const MOODS = ['haunted','incandescent','crystalline','velvet','electric','spectral','molten','glacial','luminous','tender','ruthless','hypnotic','radiant','fractured','phosphorescent','ancient','submerged','volatile','mercurial','liminal'];
const TEMPOS = ['Slow drift','Mid-tempo pulse','Driving rhythm','High-energy surge'] as const;
const ERAS = ['60s','70s','80s','90s','00s','10s','contemporary'];
const GENRES = ['indie rock','electronic','R&B','hip-hop','alternative','folk','jazz','ambient','soul','dream pop','synthpop','neo-soul','post-punk','shoegaze','pop'];

const HEADINGS = ['The weight of a held breath','Light caught in moving water','Everything tender and precise','Between the signal and the noise','Colour that sounds like something real','The slow architecture of feeling','Still here, still listening closely','Where sound becomes briefly visible','Slow burn and then sudden clarity','This is what longing looks like now','Every note leaves a different mark','The long way back to something warm'];
const SPECIMEN_BODIES = ['Discover music that moves through you like light through old glass.','Save the songs that feel like places you\'ve already been.','Your listening history, rendered in colour and form.','Every sound leaves a visual trace — this is yours.','Music is the art of the invisible made briefly visible.'];
const HEADLINES = ['Sound becomes something you see','Every note has a colour','Music you can almost touch','The feeling, now made visible','Where sound finally meets form'];
const SUBTEXTS = ['Design systems born from the music you love.','Typography that sounds like something real.','Colour built from pure, specific feeling.','Your taste in music, translated.','Let the song speak in colour and form.'];
const CTAS = ['Explore System','Start Listening','Generate More','See the Palette','Build With It'];
const RATIONALES = ['Primary colour selected from the highest-saturation pixel cluster in the album artwork. Accent is the most chromatically distinct secondary hue at sufficient luminance distance from the primary. Background is derived from the lightest sampled region; text contrast is computed to meet WCAG AA.','Colours ranked by a composite score of saturation, frequency, and proximity to mid-luminance (0.48). The top-scoring cluster fills the primary role. Accent and secondary are assigned by maximising perceptual distance from the primary while staying within the same tonal range.','Primary hue extracted from the album cover\'s dominant colour region after bucketing pixels into 24-step hue increments. The accent colour is the highest-contrast complement identified in the sample. Background lightness is normalised above 0.85 for legibility.','The primary colour reflects the artwork\'s most visually prominent chromatic zone. Secondary fills the mid-contrast gap between primary and background. Text colour is auto-generated against the background to maintain a minimum 4.5:1 contrast ratio across all palette combinations.','Palette built from pixel-cluster analysis of the album artwork at 600px resolution. Dominant clusters by saturation-weighted frequency determine primary and accent roles. Background and text are then computed to maximise readability against the extracted colour set.'];

/*
  Palette index → aesthetic cluster
  0  Midnight Abyss   dark purple/violet  → hip-hop, dark trap, Kanye, Kendrick
  1  Deep Current      dark ocean/blue     → Burial, ambient, dark electronic
  2  Harvest Cream     warm cream/orange   → folk, indie, summer, warm singer-songwriter
  3  Carbon Noir       black/grey/white    → Radiohead, alt-rock, industrial, post-rock
  4  Forest Dark       deep green          → nature-folk, acoustic, ambient-folk
  5  Rose Bloom        light pink/crimson  → Taylor Swift, bubblegum pop, romantic
  6  Bourbon Dark      dark brown/amber    → jazz, blues, soul, classic rock
  7  Storm Front       dark indigo         → post-punk, shoegaze, The Cure, dark indie
  8  Polar White       clean white/sky     → Frank Ocean, dream R&B, clean aesthetic
  9  Neon City         black/neon mag+cyan → synthwave, Daft Punk, cyberpunk, EDM
  10 Lavender Dream    soft purple         → dream pop, K-pop, Lana Del Rey, ethereal
  11 Aged Paper        warm tan/brown      → folk, vinyl-era, retro, acoustic
*/
function detectPaletteIndex(input: string, hash: number): number {
  const low = input.toLowerCase();
  const scores = new Array(PALETTES.length).fill(0);

  type Rule = { kw: string[]; top: number; alt: number; pts: number };
  const rules: Rule[] = [
    // Hip-hop, dark trap, rap
    { kw: ['kendrick','kendrick lamar','drake','kanye','travis scott','j. cole','j cole','21 savage','lil uzi','asap rocky','a$ap','playboi','future','humble','damn','astroworld','starboy','rap','trap','drill'], top: 0, alt: 7, pts: 9 },
    // Neo-soul, liquid R&B
    { kw: ['frank ocean','sza','solange','jorja smith','daniel caesar','bryson tiller','kehlani','mahalia','summers','blonde','nights','pink + white','channel orange','ctrl','r&b','neo-soul','soul'], top: 8, alt: 10, pts: 9 },
    // Dark/ambient electronic, dubstep, IDM
    { kw: ['burial','massive attack','portishead','aphex twin','boards of canada','arca','actress','four tet','james blake','bonobo','ambient','dark','underground','archangel','untrue','teardrop'], top: 1, alt: 7, pts: 10 },
    // Synthwave, retro-electronic, Daft Punk
    { kw: ['daft punk','kraftwerk','gary numan','tangerine dream','vangelis','gorillaz','justice','moderat','synthwave','retrowave','vaporwave','edm','techno','electronic','harder better','get lucky','robot rock','digital love'], top: 9, alt: 1, pts: 10 },
    // Bright pop, Taylor Swift, K-pop
    { kw: ['taylor swift','ariana grande','olivia rodrigo','dua lipa','katy perry','carly rae','meghan trainor','bts','twice','blackpink','stray kids','red (taylor','lover','folklore','evermore','1989','fearless','shake it off','cardigan','august'], top: 5, alt: 10, pts: 10 },
    // Dream pop, shoegaze, ethereal
    { kw: ['beach house','lana del rey','cocteau twins','slowdive','my bloody valentine','mazzy star','grouper','daughter','cigarettes after sex','angel olsen','weyes blood','dream pop','shoegaze','sadcore','space song','video games','blue ridge mountains'], top: 10, alt: 7, pts: 10 },
    // Post-punk, goth, dark indie
    { kw: ['joy division','the cure','bauhaus','siouxsie','wire','killing joke','depeche mode','new order','interpol','editors','bloc party','she wants revenge','post-punk','goth','cold wave','love will tear us apart','bizarre love triangle'], top: 7, alt: 3, pts: 10 },
    // Alt-rock, grunge, Radiohead
    { kw: ['radiohead','thom yorke','nirvana','kurt cobain','pixies','pavement','the national','lcd soundsystem','talking heads','sonic youth','arcade fire','creep','karma police','everything in its right place','grunge','alternative','indie rock','ok computer','kid a'], top: 3, alt: 7, pts: 9 },
    // Jazz, blues, soul, classic
    { kw: ['miles davis','coltrane','john coltrane','bill evans','charlie parker','monk','thelonious','billie holiday','ella fitzgerald','nina simone','charles mingus','kind of blue','a love supreme','jazz','blues','bebop','motown','stax'], top: 6, alt: 11, pts: 10 },
    // Folk, acoustic, indie-folk
    { kw: ['bon iver','sufjan stevens','fleet foxes','phoebe bridgers','iron and wine','nick drake','joni mitchell','crosby stills','carole king','paul simon','simon & garfunkel','folk','acoustic','indie folk','skinny love','re: stacks','holocene','motion picture'], top: 11, alt: 2, pts: 9 },
    // Indie pop / bedroom pop
    { kw: ['rex orange county','clairo','still woozy','men i trust','mac demarco','snail mail','alex g','camp cope','japanese breakfast','kacey musgraves','bedroom pop','lo-fi','lofi','indie pop','pony','sour candy','golden hour'], top: 10, alt: 2, pts: 7 },
    // Classic rock, vintage warmth
    { kw: ['the beatles','rolling stones','led zeppelin','fleetwood mac','david bowie','elton john','queen','pink floyd','simon garfunkel','creedence','eagles','classic rock','70s rock','hey jude','yesterday','bohemian rhapsody','hotel california'], top: 6, alt: 2, pts: 8 },
    // Warm / summer / golden hour
    { kw: ['summer','sunshine','tropical','golden','beach','island','california','sunset','paradise','warmth','halcyon','heat waves','levitating'], top: 2, alt: 6, pts: 5 },
    // Night / dark / void themes
    { kw: ['night','midnight','darkness','shadow','void','empty','lonely','haunted','ghost','black','oblivion','3am','dead of night','lost in the night'], top: 0, alt: 1, pts: 4 },
    // Nature / green / earth
    { kw: ['forest','rain','river','mountain','earth','trees','wilderness','moss','creek','autumn','winter'], top: 4, alt: 11, pts: 4 },
    // Neon / city / cyberpunk
    { kw: ['city','neon','cyberpunk','blade runner','tokyo','metro','urban','rave','underground club','digital'], top: 9, alt: 0, pts: 4 },
  ];

  for (const rule of rules) {
    for (const kw of rule.kw) {
      if (low.includes(kw)) {
        scores[rule.top] += rule.pts;
        scores[rule.alt] += Math.floor(rule.pts / 2);
      }
    }
  }

  const maxScore = Math.max(...scores);
  if (maxScore > 0) {
    // Collect all palettes at peak score; break ties with hash
    const winners = scores.reduce<number[]>((acc, s, i) => (s === maxScore ? [...acc, i] : acc), []);
    return winners[hash % winners.length];
  }
  // No keywords matched — use hash, but skip the pure hash pick function
  // so we get even coverage across all 12 palettes
  return (Math.abs(hash * 0x45d9f3b ^ (hash >> 5)) >>> 0) % PALETTES.length;
}

function generateSystem(input: string, artworkPalette?: ColorToken[] | null, paletteContext = input, lyricsSnippet: string | null = null): Song {
  const h = strHash(input.toLowerCase().trim());
  const parts = input.split(/\s*[–—\-]\s*/);
  const artist = parts.length > 1 ? parts[0].trim() : '';
  const songName = parts.length > 1 ? parts.slice(1).join(' ').trim() : input.trim();
  const basePalette = PALETTES[detectPaletteIndex(paletteContext, h)];
  const personalizedFallback = personalizeFallbackPalette(basePalette.colors, paletteContext, h);
  const palette = { colors: artworkPalette ?? personalizedFallback };
  const fonts = pick(FONT_PAIRS, h, 1);
  return {
    songName, artist: artist || 'Unknown Artist',
    era: pick(ERAS, h, 4), genre: pick(GENRES, h, 5),
    mood: pick(MOODS, h, 2), tempo: pick(TEMPOS, h, 3),
    palette: palette.colors,
    moodDimensions: [
      { label: 'Warmth',   value: parseFloat(seeded(h, 10).toFixed(2)) },
      { label: 'Energy',   value: parseFloat(seeded(h, 11).toFixed(2)) },
      { label: 'Darkness', value: parseFloat(seeded(h, 12).toFixed(2)) },
      { label: 'Texture',  value: parseFloat(seeded(h, 13).toFixed(2)) },
      { label: 'Intimacy', value: parseFloat(seeded(h, 14).toFixed(2)) },
    ],
    typography: { displayFont: fonts.display, displayWhy: fonts.dWhy, bodyFont: fonts.body, bodyWhy: fonts.bWhy, specimenHeading: pick(HEADINGS, h, 6), specimenBody: pick(SPECIMEN_BODIES, h, 7) },
    uiCard: { headline: pick(HEADLINES, h, 8), subtext: pick(SUBTEXTS, h, 9), ctaLabel: pick(CTAS, h, 10), bgColor: palette.colors.find(c => c.role === 'primary')?.hex ?? '#333', textColor: palette.colors.find(c => c.role === 'text')?.hex ?? '#fff', accentColor: palette.colors.find(c => c.role === 'accent')?.hex ?? '#666' },
    designRationale: pick(RATIONALES, h, 11),
    lyricsSnippet,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   SVG ILLUSTRATION COMPONENTS — hand-drawn style, blue palette
───────────────────────────────────────────────────────────────────────────── */

const CassetteIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 240 155" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="234" height="149" rx="12" fill="#6F9FC8"/>
    <rect x="3" y="3" width="234" height="149" rx="12" stroke="#5E83AE" strokeWidth="2.5"/>
    <rect x="22" y="13" width="196" height="90" rx="6" fill="#8BABBC" fillOpacity="0.38"/>
    <rect x="22" y="13" width="196" height="90" rx="6" stroke="#5E83AE" strokeWidth="1.5"/>
    <line x1="38" y1="28" x2="202" y2="28" stroke="#F9F5ED" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
    <line x1="38" y1="36" x2="160" y2="36" stroke="#F9F5ED" strokeWidth="1" strokeLinecap="round" opacity="0.2"/>
    {/* Left reel */}
    <circle cx="72" cy="78" r="34" fill="#4A7098"/>
    <circle cx="72" cy="78" r="34" stroke="#3D5C78" strokeWidth="2"/>
    <circle cx="72" cy="78" r="21" fill="#3A5870"/>
    <circle cx="72" cy="78" r="21" stroke="#2A3B4C" strokeWidth="1.5"/>
    <line x1="72" y1="57" x2="72" y2="78" stroke="#8BABBC" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="54" y1="89" x2="72" y2="78" stroke="#8BABBC" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="90" y1="89" x2="72" y2="78" stroke="#8BABBC" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="72" cy="78" r="8" fill="#2A3B4C"/>
    <circle cx="72" cy="78" r="4" fill="#6F9FC8"/>
    {/* Right reel */}
    <circle cx="168" cy="78" r="34" fill="#4A7098"/>
    <circle cx="168" cy="78" r="34" stroke="#3D5C78" strokeWidth="2"/>
    <circle cx="168" cy="78" r="21" fill="#3A5870"/>
    <circle cx="168" cy="78" r="21" stroke="#2A3B4C" strokeWidth="1.5"/>
    <line x1="168" y1="57" x2="168" y2="78" stroke="#8BABBC" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="150" y1="89" x2="168" y2="78" stroke="#8BABBC" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="186" y1="89" x2="168" y2="78" stroke="#8BABBC" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="168" cy="78" r="8" fill="#2A3B4C"/>
    <circle cx="168" cy="78" r="4" fill="#6F9FC8"/>
    {/* Tape window */}
    <path d="M 107 103 Q 120 95 133 103" stroke="#2A3B4C" fill="none" strokeWidth="3.5" strokeLinecap="round"/>
    {/* Bottom */}
    <rect x="3" y="130" width="234" height="22" rx="0" fill="#5E83AE" fillOpacity="0.6"/>
    <rect x="3" y="140" width="234" height="12" rx="0 0 12 12" fill="#4A7098" fillOpacity="0.45"/>
    <rect x="18" y="131" width="18" height="13" rx="3" fill="#3A5870"/>
    <rect x="100" y="129" width="40" height="16" rx="4" fill="#3A5870"/>
    <rect x="204" y="131" width="18" height="13" rx="3" fill="#3A5870"/>
    {/* Screws */}
    <circle cx="18" cy="18" r="5" fill="#5E83AE" stroke="#4A7098" strokeWidth="1"/>
    <circle cx="222" cy="18" r="5" fill="#5E83AE" stroke="#4A7098" strokeWidth="1"/>
    <circle cx="18" cy="118" r="5" fill="#5E83AE" stroke="#4A7098" strokeWidth="1"/>
    <circle cx="222" cy="118" r="5" fill="#5E83AE" stroke="#4A7098" strokeWidth="1"/>
  </svg>
);

const VinylIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="97" fill="#2A3B4C"/>
    <circle cx="100" cy="100" r="97" stroke="#3D5A72" strokeWidth="2"/>
    {[88,80,72,65,58,52,47].map(r => (
      <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#3A5568" strokeWidth="1" opacity="0.55"/>
    ))}
    <circle cx="100" cy="100" r="40" fill="#6F9FC8"/>
    <circle cx="100" cy="100" r="33" fill="none" stroke="#5E83AE" strokeWidth="1.5" opacity="0.6"/>
    <line x1="78" y1="96" x2="122" y2="96" stroke="#F9F5ED" strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
    <line x1="82" y1="103" x2="118" y2="103" stroke="#F9F5ED" strokeWidth="1.5" opacity="0.35" strokeLinecap="round"/>
    <line x1="88" y1="110" x2="112" y2="110" stroke="#F9F5ED" strokeWidth="1.5" opacity="0.25" strokeLinecap="round"/>
    <circle cx="100" cy="100" r="6" fill="#F9F5ED"/>
    <circle cx="100" cy="100" r="3.5" fill="#E8E0D4"/>
    <ellipse cx="70" cy="60" rx="25" ry="13" fill="white" fillOpacity="0.04" transform="rotate(-30 70 60)"/>
  </svg>
);

/* Redesigned headphones — clear modern over-ear studio style */
const HeadphonesIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 200 195" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Headband outer */}
    <path d="M 32 118 C 32 38 168 38 168 118" stroke="#5E83AE" strokeWidth="18" fill="none" strokeLinecap="round"/>
    {/* Headband inner padding */}
    <path d="M 38 116 C 38 52 162 52 162 116" stroke="#8BABBC" strokeWidth="8" fill="none" strokeLinecap="round"/>
    {/* Headband highlight */}
    <path d="M 52 98 C 56 58 144 58 148 98" stroke="#B8D0DC" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.55"/>
    {/* Left yoke */}
    <path d="M 32 118 L 20 142" stroke="#5E83AE" strokeWidth="11" strokeLinecap="round"/>
    {/* Left ear cup body */}
    <rect x="4" y="132" width="36" height="52" rx="14" fill="#5E83AE"/>
    <rect x="4" y="132" width="36" height="52" rx="14" stroke="#3D5C78" strokeWidth="2"/>
    {/* Left ear pad */}
    <rect x="10" y="140" width="24" height="36" rx="9" fill="#6F9FC8"/>
    {/* Left grille pattern */}
    <circle cx="16" cy="153" r="2.5" fill="#4A7098"/>
    <circle cx="22" cy="153" r="2.5" fill="#4A7098"/>
    <circle cx="28" cy="153" r="2.5" fill="#4A7098"/>
    <circle cx="16" cy="162" r="2.5" fill="#4A7098"/>
    <circle cx="22" cy="162" r="2.5" fill="#4A7098"/>
    <circle cx="28" cy="162" r="2.5" fill="#4A7098"/>
    {/* Left cup highlight */}
    <ellipse cx="14" cy="145" rx="7" ry="4.5" fill="#8BABBC" fillOpacity="0.38"/>
    {/* Right yoke */}
    <path d="M 168 118 L 180 142" stroke="#5E83AE" strokeWidth="11" strokeLinecap="round"/>
    {/* Right ear cup body */}
    <rect x="160" y="132" width="36" height="52" rx="14" fill="#5E83AE"/>
    <rect x="160" y="132" width="36" height="52" rx="14" stroke="#3D5C78" strokeWidth="2"/>
    {/* Right ear pad */}
    <rect x="166" y="140" width="24" height="36" rx="9" fill="#6F9FC8"/>
    {/* Right grille */}
    <circle cx="172" cy="153" r="2.5" fill="#4A7098"/>
    <circle cx="178" cy="153" r="2.5" fill="#4A7098"/>
    <circle cx="184" cy="153" r="2.5" fill="#4A7098"/>
    <circle cx="172" cy="162" r="2.5" fill="#4A7098"/>
    <circle cx="178" cy="162" r="2.5" fill="#4A7098"/>
    <circle cx="184" cy="162" r="2.5" fill="#4A7098"/>
    {/* Right cup highlight */}
    <ellipse cx="170" cy="145" rx="7" ry="4.5" fill="#8BABBC" fillOpacity="0.38"/>
    {/* Cord from left bottom */}
    <path d="M 22 184 Q 14 192 10 200" stroke="#5E83AE" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
  </svg>
);

const WaveformIllustration = ({ className }: { className?: string }) => {
  const heights = [5,9,15,22,30,38,44,52,58,64,58,52,46,40,32,24,17,11,7,5];
  return (
    <svg className={className} viewBox="0 0 228 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {heights.map((h, i) => (
        <rect key={i} x={i * 11 + 4} y={(80 - h) / 2} width="7" height={h} rx="3.5"
          fill="#6F9FC8" fillOpacity={0.45 + (h / 64) * 0.55}/>
      ))}
      <line x1="118" y1="6" x2="118" y2="74" stroke="#5E83AE" strokeWidth="2" strokeDasharray="4 3" opacity="0.8"/>
      <circle cx="118" cy="6"  r="4.5" fill="#6F9FC8"/>
      <circle cx="118" cy="74" r="4.5" fill="#6F9FC8"/>
    </svg>
  );
};

const CDIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="90" cy="90" r="86" fill="#6F9FC8"/>
    <circle cx="90" cy="90" r="86" stroke="#5E83AE" strokeWidth="2"/>
    <circle cx="90" cy="90" r="74" fill="none" stroke="#8BABBC" strokeWidth="1.5" opacity="0.7"/>
    <circle cx="90" cy="90" r="62" fill="none" stroke="#A8C4D4" strokeWidth="1.5" opacity="0.6"/>
    <circle cx="90" cy="90" r="50" fill="none" stroke="#8BABBC" strokeWidth="1.5" opacity="0.5"/>
    <circle cx="90" cy="90" r="38" fill="none" stroke="#A8C4D4" strokeWidth="1.5" opacity="0.4"/>
    <circle cx="90" cy="90" r="28" fill="#5E83AE" fillOpacity="0.55"/>
    <ellipse cx="65" cy="55" rx="30" ry="17" fill="white" fillOpacity="0.11" transform="rotate(-30 65 55)"/>
    <circle cx="90" cy="90" r="10" fill="#F9F5ED"/>
    <circle cx="90" cy="90" r="6"  fill="#E8E0D4"/>
  </svg>
);

/* Single 8th note */
const MusicalNote = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 52 78" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Note head */}
    <ellipse cx="17" cy="65" rx="16" ry="11" fill="#6F9FC8" transform="rotate(-16 17 65)"/>
    <ellipse cx="17" cy="65" rx="16" ry="11" fill="none" stroke="#5E83AE" strokeWidth="1.5" transform="rotate(-16 17 65)"/>
    {/* Stem */}
    <line x1="31" y1="60" x2="31" y2="10" stroke="#5E83AE" strokeWidth="4.5" strokeLinecap="round"/>
    {/* Flag */}
    <path d="M 31 10 Q 50 20 44 38" stroke="#5E83AE" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* Beamed double 8th notes */
const DoubleNote = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 115 88" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Left note head */}
    <ellipse cx="17" cy="74" rx="15" ry="11" fill="#6F9FC8" transform="rotate(-15 17 74)"/>
    <ellipse cx="17" cy="74" rx="15" ry="11" fill="none" stroke="#5E83AE" strokeWidth="1.5" transform="rotate(-15 17 74)"/>
    {/* Right note head (slightly higher pitch) */}
    <ellipse cx="85" cy="66" rx="15" ry="11" fill="#6F9FC8" transform="rotate(-15 85 66)"/>
    <ellipse cx="85" cy="66" rx="15" ry="11" fill="none" stroke="#5E83AE" strokeWidth="1.5" transform="rotate(-15 85 66)"/>
    {/* Stems */}
    <line x1="30" y1="68" x2="30" y2="14" stroke="#5E83AE" strokeWidth="4.5" strokeLinecap="round"/>
    <line x1="98" y1="60" x2="98" y2="6"  stroke="#5E83AE" strokeWidth="4.5" strokeLinecap="round"/>
    {/* Beam 1 */}
    <line x1="30" y1="14" x2="98" y2="6"  stroke="#5E83AE" strokeWidth="5.5" strokeLinecap="round"/>
    {/* Beam 2 */}
    <line x1="30" y1="23" x2="98" y2="15" stroke="#5E83AE" strokeWidth="5.5" strokeLinecap="round"/>
  </svg>
);

/* Compact 5-bar sound wave */
const MiniSoundWave = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 88 62" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4"  y="21" width="12" height="20" rx="6" fill="#6F9FC8" fillOpacity="0.6"/>
    <rect x="22" y="12" width="12" height="38" rx="6" fill="#6F9FC8" fillOpacity="0.75"/>
    <rect x="38" y="4"  width="12" height="54" rx="6" fill="#6F9FC8"/>
    <rect x="54" y="12" width="12" height="38" rx="6" fill="#6F9FC8" fillOpacity="0.75"/>
    <rect x="70" y="21" width="12" height="20" rx="6" fill="#6F9FC8" fillOpacity="0.6"/>
  </svg>
);

/* 45rpm record adaptor / spider */
const RecordAdaptor = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer disc */}
    <circle cx="45" cy="45" r="42" fill="#6F9FC8"/>
    <circle cx="45" cy="45" r="42" stroke="#5E83AE" strokeWidth="2"/>
    {/* 5 D-shaped prong cutouts, equally spaced */}
    {[0, 72, 144, 216, 288].map(deg => {
      const r = deg * Math.PI / 180;
      const cx = 45 + 26 * Math.sin(r);
      const cy = 45 - 26 * Math.cos(r);
      return (
        <ellipse key={deg} cx={cx} cy={cy} rx="10" ry="14"
          fill="#F9F5ED" fillOpacity="0.82"
          transform={`rotate(${deg} ${cx} ${cy})`}/>
      );
    })}
    {/* Inner ring */}
    <circle cx="45" cy="45" r="14" fill="#5E83AE"/>
    {/* Center hole */}
    <circle cx="45" cy="45" r="8" fill="#F9F5ED" fillOpacity="0.9"/>
    <circle cx="45" cy="45" r="4" fill="#6F9FC8"/>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN VINYL RECORD — loading stage, with smooth artwork fade
───────────────────────────────────────────────────────────────────────────── */

const MainVinylRecord = ({
  artworkUrl,
  showArt = false,
  size = 360,
}: {
  artworkUrl: string | null;
  showArt?: boolean;
  size?: number;
}) => (
  <svg viewBox="0 0 400 400" width={size} height={size} className="main-vinyl-svg">
    <defs>
      <clipPath id="artClipMain">
        <circle cx="200" cy="200" r="74"/>
      </clipPath>
    </defs>

    {/* Outer disc */}
    <circle cx="200" cy="200" r="194" fill="#1e2d3d"/>
    <circle cx="200" cy="200" r="193" fill="none" stroke="#2a4060" strokeWidth="2"/>

    {/* Groove rings */}
    {Array.from({ length: 24 }, (_, i) => 188 - i * 5).map(r => (
      <circle key={r} cx="200" cy="200" r={r} fill="none"
        stroke="#2a3f52" strokeWidth="0.9"
        opacity={0.18 + ((188 - r) / 188) * 0.5}/>
    ))}

    {/* Default label — always visible, replaced by artwork when available */}
    <circle cx="200" cy="200" r="78" fill="#6F9FC8"/>
    <text x="200" y="197" textAnchor="middle" fill="white" fontSize="11"
      fontFamily="'DM Sans',sans-serif" fontWeight="700" letterSpacing="3" opacity="0.9">CASSETTE</text>
    <text x="200" y="213" textAnchor="middle" fill="white" fontSize="8"
      fontFamily="'DM Sans',sans-serif" letterSpacing="2" opacity="0.5">DESIGN SYSTEM</text>

    {/* Album artwork — fades in smoothly via CSS opacity transition */}
    {artworkUrl && (
      <image
        href={artworkUrl}
        x="126" y="126" width="148" height="148"
        clipPath="url(#artClipMain)"
        preserveAspectRatio="xMidYMid slice"
        style={{
          opacity: showArt ? 1 : 0,
          transition: 'opacity 0.75s ease-in-out',
        }}
      />
    )}

    {/* Label edge ring — sits above artwork */}
    <circle cx="200" cy="200" r="76" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>

    {/* Center hole */}
    <circle cx="200" cy="200" r="9"   fill="#F9F5ED"/>
    <circle cx="200" cy="200" r="5.5" fill="#e4ddd2"/>

    {/* Subtle sheen */}
    <ellipse cx="155" cy="135" rx="40" ry="22" fill="white" fillOpacity="0.035"
      transform="rotate(-30 155 135)"/>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
   BACKGROUND ILLUSTRATIONS — 13 elements, varied sizes, full-page coverage
───────────────────────────────────────────────────────────────────────────── */

const BackgroundIllustrations = () => (
  <div className="bg-illustrations" aria-hidden="true">
    {/* Large anchors */}
    <CassetteIllustration   className="bg-illus bg-cassette-tl"/>
    <VinylIllustration      className="bg-illus bg-vinyl-tr"/>
    <HeadphonesIllustration className="bg-illus bg-headphones-ml"/>
    <WaveformIllustration   className="bg-illus bg-waveform-mr"/>
    <CDIllustration         className="bg-illus bg-cd-bl"/>
    <CassetteIllustration   className="bg-illus bg-cassette-br"/>
    {/* Medium fillers */}
    <VinylIllustration      className="bg-illus bg-mini-vinyl-mm"/>
    <RecordAdaptor          className="bg-illus bg-adaptor-cl"/>
    <MiniSoundWave          className="bg-illus bg-wave-sm-cr"/>
    {/* Small notes & accents */}
    <MusicalNote            className="bg-illus bg-note-tc"/>
    <MusicalNote            className="bg-illus bg-note-tr2"/>
    <DoubleNote             className="bg-illus bg-dbl-note-bc"/>
    <MusicalNote            className="bg-illus bg-note-bm"/>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   LYRICS
───────────────────────────────────────────────────────────────────────────── */

async function fetchLyrics(artist: string, title: string): Promise<string | null> {
  if (!artist || !title) return null;
  try {
    const a = encodeURIComponent(artist);
    const t = encodeURIComponent(title);
    const res = await fetch(`https://api.lyrics.ovh/v1/${a}/${t}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.lyrics === 'string' && data.lyrics.length > 0 ? data.lyrics : null;
  } catch { return null; }
}

function extractLyricSnippet(lyrics: string): string {
  const lines = lyrics
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('[') && !l.endsWith(']'));
  if (lines.length === 0) return '';

  // Find repeated lines — these are the chorus
  const freq = new Map<string, number>();
  for (const line of lines) freq.set(line, (freq.get(line) ?? 0) + 1);
  const repeated = lines.filter(l => (freq.get(l) ?? 0) >= 2);

  if (repeated.length >= 2) {
    const firstIdx = lines.indexOf(repeated[0]);
    return lines.slice(firstIdx, firstIdx + 4).join('\n');
  }

  // Fallback: pull 4 lines from ~40% through (typically chorus territory)
  const start = Math.floor(lines.length * 0.4);
  return lines.slice(start, start + 4).join('\n');
}

/* ─────────────────────────────────────────────────────────────────────────────
   ITUNES
───────────────────────────────────────────────────────────────────────────── */

/* Version indicators to deprioritise unless the user explicitly asked for one. */
const VERSION_KEYWORDS = [
  'remix', 'remaster', 'remastered', 'sped up', 'spedup', 'slowed', 'reverb',
  'nightcore', 'cover', 'live', 'acoustic', 'instrumental', 'edit', 'bootleg',
  'mashup', 'karaoke', 'tribute', 'demo', 'session', 'radio edit',
];

function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/* Loosely parse free-form input into { artist, title }.
   Accepts: "Artist - Song", "Song by Artist", "Artist Song", or just "Song". */
function parseQuery(raw: string): { artist: string; title: string; raw: string; wantsAlt: boolean } {
  const s = raw.trim();
  let artist = '';
  let title = s;
  if (/\s[–—-]\s/.test(s)) {
    const p = s.split(/\s*[–—-]\s*/);
    artist = p[0].trim();
    title = p.slice(1).join(' ').trim();
  } else {
    const byMatch = s.match(/^(.*?)\s+by\s+(.+)$/i);
    if (byMatch) { title = byMatch[1].trim(); artist = byMatch[2].trim(); }
  }
  const wantsAlt = VERSION_KEYWORDS.some(k => normalizeStr(s).includes(k));
  return { artist, title, raw: s, wantsAlt };
}

/* Token-overlap similarity in [0,1]. */
function similarity(a: string, b: string): number {
  const na = normalizeStr(a), nb = normalizeStr(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (nb.includes(na) || na.includes(nb)) return 0.85;
  const ta = new Set(na.split(' ')), tb = new Set(nb.split(' '));
  let inter = 0;
  ta.forEach(t => { if (tb.has(t)) inter++; });
  return inter / Math.max(ta.size, tb.size);
}

/* Rank a result against the parsed query. Higher is better. */
function scoreResult(r: iTunesResult, q: ReturnType<typeof parseQuery>): number {
  const title = r.trackName ?? '';
  const artist = r.artistName ?? '';
  const coll = r.collectionName ?? '';
  let score = 0;
  score += similarity(q.title, title) * 60;          // exact/near title match
  if (q.artist) score += similarity(q.artist, artist) * 40; // exact/near artist match
  else score += similarity(q.raw, `${artist} ${title}`) * 30;
  // Deprioritise alternate versions unless the user explicitly asked for one.
  if (!q.wantsAlt) {
    const hay = normalizeStr(`${title} ${coll}`);
    for (const k of VERSION_KEYWORDS) { if (hay.includes(k)) score -= 22; }
  }
  return score;
}

/* Flexible, ranked iTunes search that prioritises the original/official track. */
async function fetchITunes(query: string): Promise<{ result: iTunesResult | null; confident: boolean }> {
  const q = parseQuery(query);
  const term = q.artist ? `${q.artist} ${q.title}` : q.title;
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=25`);
    const data = await res.json();
    const results: iTunesResult[] = (data.results ?? []).filter((r: any) => r?.trackName);
    if (results.length === 0) return { result: null, confident: false };
    const ranked = results
      .map(r => ({ r, score: scoreResult(r, q) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    return { result: best.r, confident: best.score >= 45 };
  } catch { return { result: null, confident: false }; }
}

/* ─────────────────────────────────────────────────────────────────────────────
   APP
───────────────────────────────────────────────────────────────────────────── */

// Total time on the vinyl stage before results appear
const VINYL_TOTAL_MS  = 10500;
const FADE_DURATION_MS = 2600;
const FADE_START_MS   = VINYL_TOTAL_MS - FADE_DURATION_MS; // 7900ms

/* Pick a musically meaningful start offset within the preview clip. Prefers a
   section past the intro (~chorus/hook territory) while staying safely inside
   the available duration. Falls back to 8s when duration metadata is missing. */
function catchyStart(duration: number): number {
  if (!isFinite(duration) || duration <= 0) return 8;
  const target = duration * 0.4;
  return clamp(target, 0, Math.max(0, duration - 6));
}

/* Seek an audio element to its catchy section, waiting for metadata if needed. */
function seekToCatchy(audio: HTMLAudioElement) {
  const apply = () => { audio.currentTime = catchyStart(audio.duration); };
  if (audio.readyState >= 1 && isFinite(audio.duration)) apply();
  else audio.addEventListener('loadedmetadata', apply, { once: true });
}

export default function App() {
  const [stage, setStage]                   = useState<'landing' | 'vinyl' | 'results'>('landing');
  const [songInput, setSongInput]           = useState('');
  const [error, setError]                   = useState('');
  const [isGenerating, setIsGenerating]     = useState(false);
  const [systemData, setSystemData]         = useState<Song | null>(null);
  const [artworkUrl, setArtworkUrl]         = useState<string | null>(null);
  const [previewUrl, setPreviewUrl]         = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showVinylArt, setShowVinylArt]     = useState(false);
  const [vinylSpinning, setVinylSpinning]   = useState(false);
  const [vinylFading, setVinylFading]       = useState(false);
  const [isDark, setIsDark]                 = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Ref so fade-out interval can be cleared if user resets early
  const fadeOutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const generate = async () => {
    if (!songInput.trim()) return;

    // Reset any in-progress fade
    if (fadeOutRef.current) { clearInterval(fadeOutRef.current); fadeOutRef.current = null; }

    setIsGenerating(true);
    setError('');
    setShowVinylArt(false);
    setStage('vinyl');
    setVinylSpinning(true);

    try {
      const response = await fetch(`http://localhost:8080/api/analyze?q=${encodeURIComponent(songInput)}`);
      if (!response.ok) {
        throw new Error("Couldn't find that song. Try adding the artist name.");
      }
      
      const data = await response.json();
      const s = data.song;
      
      setArtworkUrl(s.artworkUrl);
      setPreviewUrl(s.previewUrl || null);
      
      const h = strHash(songInput.toLowerCase().trim());
      const paletteContext = `${s.artist} ${s.songName} ${s.genre}`.trim();
      let artworkPalette = null;
      if (s.artworkUrl) {
         artworkPalette = await extractArtworkPalette(s.artworkUrl, paletteContext, h);
      }
      
      const fallbackColors: ColorToken[] = [
        { hex: '#1C0F2E', name: 'Background', role: 'background' },
        { hex: '#7C3AED', name: 'Primary', role: 'primary' },
        { hex: '#EC4899', name: 'Accent', role: 'accent' },
        { hex: '#C4B5FD', name: 'Secondary', role: 'secondary' },
        { hex: '#F5F3FF', name: 'Text', role: 'text' }
      ];
      
      const palette = artworkPalette || fallbackColors;

      const system: Song = {
        ...s,
        palette: palette,
        moodDimensions: s.moodDimensions || [
          { label: 'Warmth',   value: 65 },
          { label: 'Energy',   value: 80 },
          { label: 'Darkness', value: 30 },
          { label: 'Texture',  value: 45 },
          { label: 'Intimacy', value: 70 },
        ],
        uiCard: { 
          ...s.uiCard, 
          bgColor: palette.find(c => c.role === 'primary')?.hex ?? '#333', 
          textColor: palette.find(c => c.role === 'text')?.hex ?? '#fff', 
          accentColor: palette.find(c => c.role === 'accent')?.hex ?? '#666' 
        }
      };
      
      setSystemData(system);
      setTimeout(() => setShowVinylArt(true), 400);

      if (s.previewUrl && audioRef.current) {
        audioRef.current.src = s.previewUrl;
        audioRef.current.volume = 0;
        audioRef.current.play().catch(() => {});
        setIsAudioPlaying(true);
        let vol = 0;
        const fadeIn = setInterval(() => {
          if (!audioRef.current) { clearInterval(fadeIn); return; }
          vol = Math.min(0.65, vol + 0.04);
          audioRef.current.volume = vol;
          if (vol >= 0.65) clearInterval(fadeIn);
        }, 80);
      }
      
      setTimeout(() => {
        setVinylFading(true);
        setTimeout(() => {
          setStage('results');
          setVinylSpinning(false);
          setVinylFading(false);
          setIsGenerating(false);
        }, 1200);
      }, 3500);
      
    } catch (e: any) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      setVinylSpinning(false);
      setStage('landing');
      setError(e.message || 'An error occurred.');
      setIsGenerating(false);
    }
  };

  const reset = () => {
    if (fadeOutRef.current) { clearInterval(fadeOutRef.current); fadeOutRef.current = null; }
    setStage('landing');
    setSongInput('');
    setError('');
    setSystemData(null);
    setArtworkUrl(null);
    setPreviewUrl(null);
    setIsAudioPlaying(false);
    setVinylSpinning(false);
    setVinylFading(false);
    setShowVinylArt(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
  };

  const toggleAudio = () => {
    if (!previewUrl || !audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.src = previewUrl;
      // Start at the catchy section (chorus/hook territory) rather than 0:00
      seekToCatchy(audioRef.current);
      audioRef.current.volume = 0.65;
      audioRef.current.play().catch(() => {});
      setIsAudioPlaying(true);
    } else {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text).catch(() => {});
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') generate(); };

  useEffect(() => {
    if (!systemData) return;
    const df = systemData.typography.displayFont.replace(/ /g, '+');
    const bf = systemData.typography.bodyFont.replace(/ /g, '+');
    const link = document.createElement('link');
    link.rel = 'stylesheet';

    let fontFamilies = [df, bf];
    if (systemData.typography.categories) {
      systemData.typography.categories.forEach(cat => {
        cat.fonts.forEach(f => {
          fontFamilies.push(f.replace(/ /g, '+'));
        });
      });
    }

    // Remove duplicates
    fontFamilies = [...new Set(fontFamilies)];
    const familyString = fontFamilies.map(f => `family=${f}:wght@400;500;600;700`).join('&');

    link.href = `https://fonts.googleapis.com/css2?${familyString}&display=swap`;
    document.head.appendChild(link);
  }, [systemData]);

  const parts     = songInput.split(/[–—-]/);
  const songTitle = (parts[1]?.trim() || songInput).toUpperCase();
  const artistName = parts[0]?.trim() || '';

  return (
    <div className="app">
      {/* ── THEME TOGGLE ── */}
      <button
        className={`theme-toggle ${isDark ? 'is-dark' : ''}`}
        onClick={() => setIsDark(d => !d)}
        aria-label="Toggle dark mode"
      >
        {/* Sun */}
        <svg className="toggle-icon toggle-sun" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="3.5" fill="currentColor"/>
          <line x1="10" y1="1.5" x2="10" y2="3.5"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="10" y1="16.5" x2="10" y2="18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="1.5" y1="10" x2="3.5" y2="10"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="16.5" y1="10" x2="18.5" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="4.1" y1="4.1" x2="5.5" y2="5.5"   stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="14.5" y1="14.5" x2="15.9" y2="15.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="15.9" y1="4.1" x2="14.5" y2="5.5"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="5.5" y1="14.5" x2="4.1" y2="15.9"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        {/* Track */}
        <div className="toggle-track">
          <div className="toggle-thumb"/>
        </div>
        {/* Moon */}
        <svg className="toggle-icon toggle-moon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.5 11.5A7 7 0 1 1 8.5 3.5a5.5 5.5 0 0 0 8 8z" fill="currentColor"/>
        </svg>
      </button>

      <BackgroundIllustrations/>

      {/* ── STAGE 1: LANDING ── */}
      {stage === 'landing' && (
        <div className="stage stage-landing">
          <p className="landing-eyebrow">Type a song. Get a design system.</p>
          <div className="landing-logo">CASSETTE</div>
          <div className="landing-rule"/>
          <div className="landing-input-wrap">
            <span className="landing-prefix">♫</span>
            <input
              type="text" className="landing-input"
              placeholder="e.g. Frank Ocean – Nights"
              value={songInput}
              onChange={e => setSongInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off" spellCheck={false}
            />
            <button className="landing-btn" onClick={generate}
              disabled={isGenerating || !songInput.trim()}>
              GENERATE
            </button>
          </div>
          <p className="landing-hint">
            Try: Daft Punk – Harder Better Faster Stronger · Taylor Swift – Midnights<br/>
            Kendrick Lamar – HUMBLE. · Burial – Archangel · Radiohead – Creep
          </p>
          {error && <p className="error-msg">{error}</p>}
        </div>
      )}

      {/* ── STAGE 2: VINYL ── */}
      {stage === 'vinyl' && (
        <div className={`stage stage-vinyl${vinylFading ? ' fading-out' : ''}`}>
          <div className="vinyl-backdrop"/>
          <div className="vinyl-scene">
            <div className="vinyl-disc-wrap spinning">
              <MainVinylRecord artworkUrl={artworkUrl} showArt={showVinylArt} size={360}/>
            </div>
            <div className="vinyl-info">
              <div className="vinyl-song-title">{songTitle}</div>
              {artistName && <div className="vinyl-song-artist">{artistName}</div>}
              <div className={`audio-bars ${!isAudioPlaying ? 'paused' : ''}`}>
                {[...Array(7)].map((_, i) => <div key={i} className="ab"/>)}
              </div>
              <div className="preview-label" style={{ opacity: isAudioPlaying ? 1 : 0.4 }}>
                {isAudioPlaying ? '♫ Preview playing' : 'Generating your design system…'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE 3: RESULTS ── */}
      {stage === 'results' && systemData && (
        <div className="stage stage-results">
          <header className="results-header">
            <div className="header-left">
              <button className="again-btn" onClick={reset}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 .49-3.75"/>
                </svg>
                Generate Again
              </button>
              <span className="header-logo">CASSETTE</span>
            </div>
            {artworkUrl && previewUrl && (
              <div className="vinyl-player" onClick={toggleAudio}>
                <div className={`stamp-vinyl-bg ${isAudioPlaying ? 'playing' : ''}`}/>
                <img className="stamp-img" src={artworkUrl} alt="Album"/>
                <div className={`play-dot ${isAudioPlaying ? 'active' : ''}`}/>
                <div className="vinyl-player-hint">{isAudioPlaying ? 'pause' : 'play'}</div>
              </div>
            )}
          </header>

          <div className="results-body">
            <div className="song-hero">
              <div className="hero-title">{systemData.songName.toUpperCase()}</div>
              <div className="hero-meta">
                <span className="meta-pill">{systemData.artist}</span>
                <span className="meta-pill">{systemData.era}</span>
                <span className="meta-pill">{systemData.genre}</span>
                <span className="meta-pill">{systemData.mood}</span>
              </div>
            </div>

            <div className="rationale-strip">{systemData.designRationale}</div>

            <div className="panel">
              <div className="panel-label">Colour Palette</div>
              <div className="palette-swatches">
                {systemData.palette.map((color, i) => (
                  <div key={i} className="swatch" style={{ background: color.hex }}
                    onClick={() => copyToClipboard(color.hex)}>
                    <div className="swatch-label">{color.hex}</div>
                  </div>
                ))}
              </div>
              <div className="palette-names">
                {systemData.palette.map((color, i) => (
                  <div key={i} className="palette-name-item">
                    <div className="name-dot" style={{ background: color.hex }}/>
                    <span>{color.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="two-col">
              <div className="panel">
                <div className="panel-label">Mood Mapping</div>
                <div className="mood-words">
                  {systemData.moodDimensions.map((mood, i) => (
                    <div key={i} className="mood-word">
                      <span className="mood-word-label">{mood.label}</span>
                      <div className="mood-bar-track">
                        <div className="mood-bar-fill" style={{ width: `${mood.value * 100}%` }}/>
                      </div>
                      <span className="mood-bar-val">{Math.round(mood.value * 100)}</span>
                    </div>
                  ))}
                </div>
                <div className="tempo-chip">
                  <div className="tempo-dot"/>
                  <span>{systemData.tempo}</span>
                </div>
              </div>

              <div className="panel">
                <div className="panel-label">UI Card Preview</div>
                <div className="ui-card-preview"
                  style={{ background: systemData.uiCard.bgColor, color: systemData.uiCard.textColor }}>
                  <div className="ui-card-header">
                    <div className="ui-card-dots">
                      <div className="ui-dot"/><div className="ui-dot"/><div className="ui-dot"/>
                    </div>
                    <span className="ui-card-tag">{systemData.genre}</span>
                  </div>
                  <div className="ui-card-body">
                    <div className="ui-card-headline"
                      style={{ fontFamily: systemData.typography.displayFont }}>
                      {systemData.uiCard.headline}
                    </div>
                    <div className="ui-card-subtext"
                      style={{ fontFamily: systemData.typography.bodyFont }}>
                      {systemData.uiCard.subtext}
                    </div>
                    <button className="ui-card-btn"
                      style={{ background: systemData.uiCard.accentColor, color: systemData.uiCard.bgColor }}>
                      {systemData.uiCard.ctaLabel}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-label">Typography System</div>
              <div className="type-specimen"
                style={{ fontFamily: systemData.typography.displayFont }}>
                <div className="type-role" style={{ marginBottom: '16px' }}>Preview</div>
                {(() => {
                  const lyricLines = systemData.lyricsSnippet?.split('\n').filter(l => l.trim()) ?? [];
                  const displayLine = lyricLines[0] ?? systemData.typography.specimenHeading;
                  const bodyText = lyricLines.length > 1
                    ? lyricLines.slice(1, 3).join('\n')
                    : systemData.typography.specimenBody;
                  return (
                    <>
                      <div className="specimen-heading">{displayLine}</div>
                      <div className="specimen-body"
                        style={{ fontFamily: systemData.typography.bodyFont }}>
                        {bodyText}
                      </div>
                    </>
                  );
                })()}
              </div>
              
              <div className="type-pair-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                {systemData.typography.categories?.map((cat, i) => (
                  <div key={i} className="type-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
                    <div className="type-role" style={{ color: 'var(--accent)', marginBottom: '12px' }}>{cat.name}</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {cat.fonts.map((f, j) => (
                        <div key={j}>
                          <div className="type-name" style={{ fontFamily: f, fontSize: '22px', lineHeight: '1.2' }}>
                            {f}
                          </div>
                          <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '4px', letterSpacing: '1px' }}>
                            {j === 0 ? 'PRIMARY' : 'SECONDARY'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-label">Design Tokens</div>
              <div className="tokens-grid">
                {[
                  ['--color-bg',        systemData.palette.find(c => c.role === 'background')?.hex ?? systemData.palette[3].hex],
                  ['--color-primary',   systemData.palette.find(c => c.role === 'primary')?.hex    ?? systemData.palette[0].hex],
                  ['--color-secondary', systemData.palette.find(c => c.role === 'secondary')?.hex  ?? systemData.palette[1].hex],
                  ['--color-accent',    systemData.palette.find(c => c.role === 'accent')?.hex     ?? systemData.palette[2].hex],
                  ['--color-text',      systemData.palette.find(c => c.role === 'text')?.hex       ?? systemData.palette[4].hex],
                  ['--font-display',    `'${systemData.typography.displayFont}'`],
                  ['--font-body',       `'${systemData.typography.bodyFont}'`],
                  ['--mood',            systemData.mood],
                  ['--tempo',           systemData.tempo.split(' ')[0].toLowerCase()],
                ].map(([key, val], i) => (
                  <div key={i} className="token-item">
                    <span className="token-key">{key}</span>
                    <span className="token-val" onClick={() => copyToClipboard(val)}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef}/>
    </div>
  );
}
