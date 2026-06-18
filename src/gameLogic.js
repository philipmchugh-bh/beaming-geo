// Seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function dateToSeed(dateStr) {
  // dateStr: "YYYY-MM-DD"
  return dateStr.split('-').reduce((acc, part, i) => acc + parseInt(part) * [10000, 100, 1][i], 0);
}

export function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDailyProviders(providers, dateStr, count = 3) {
  const seed = dateToSeed(dateStr);
  const rand = mulberry32(seed);
  const shuffled = [...providers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// Haversine distance in km
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function scoreForDistance(km) {
  const mi = km * 0.621371;
  if (mi <= 10) return 100;
  if (mi <= 20) {
    // steps down 1 pt per 2 miles: 11-12=95, 13-14=94, 15-16=93, 17-18=92, 19-20=91
    return 96 - Math.ceil((mi - 10) / 2);
  }
  if (mi <= 100) return Math.round(90 - (mi - 20) * 0.5);     // 90 at 20mi → 50 at 100mi
  if (mi <= 500) return Math.round(Math.max(5, 40 - (mi - 100) * (35 / 400))); // 40 at 100mi → 5 at 500mi
  return 5;
}

export function emojiForDistance(km) {
  const mi = km * 0.621371;
  if (mi < 20)  return '🟩';
  if (mi < 100) return '🟨';
  return '🟥';
}

export function formatDistance(km) {
  if (km < 1) return '<1 km';
  return `${Math.round(km).toLocaleString()} km`;
}

export function formatMiles(km) {
  const mi = km * 0.621371;
  if (mi < 1) return '<1 mi';
  return `${Math.round(mi).toLocaleString()} mi`;
}

const STORAGE_KEY_PREFIX = 'beaming-geo-';

export function loadSavedGame(dateStr) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + dateStr);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGame(dateStr, state) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + dateStr, JSON.stringify(state));
  } catch {}
}

export function buildShareText(dateStr, rounds) {
  const display = (() => {
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(m)}/${parseInt(d)}/${y}`;
  })();
  const emojis = rounds.map(r => r.emoji).join(' ');
  const total = rounds.reduce((s, r) => s + r.score, 0);
  return `Beaming Geo ${display}\n${emojis}\n${total}/300 pts`;
}
