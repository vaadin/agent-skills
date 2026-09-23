/**
 * Converts the literal color values Aura declares into sRGB hex.
 *
 * Aura states its palette in `oklch()`, which is wider than sRGB. There is no
 * regex for that conversion, so the OKLab math is done here rather than taken
 * from the reference by hand. Channels outside sRGB are clipped per channel,
 * which is what browsers paint today on an sRGB display; `inSrgbGamut` records
 * when that clipping happened.
 */

const EPSILON = 1e-6;

/** Anything interpolated, referenced, or scheme-dependent cannot be resolved here. */
const UNRESOLVABLE = /\b(?:var|calc|light-dark|color-mix|from)\b|\bfrom\s/;

function parseAngle(token) {
  const match = /^(-?[\d.]+)(deg|rad|grad|turn)?$/i.exec(token);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null; // "." matches the pattern but is not a number
  switch (match[2]?.toLowerCase()) {
    case 'rad':
      return (value * 180) / Math.PI;
    case 'grad':
      return value * 0.9;
    case 'turn':
      return value * 360;
    default:
      return value;
  }
}

/**
 * Splits a color function's arguments. Anything but three clean components —
 * `rgb(1,,2,3)` — is invalid and must not be quietly normalized into three.
 * Only `rgb()` has the legacy comma syntax; `oklch()` is space-separated only.
 */
function splitComponents(text, { commas = false } = {}) {
  if (text.includes(',') && !commas) return null;
  const parts = text.includes(',') ? text.split(',') : text.split(/\s+/);
  if (parts.length !== 3) return null;
  const trimmed = parts.map((part) => part.trim());
  return trimmed.some((part) => part === '' || /\s/.test(part)) ? null : trimmed;
}

function parseNumber(token, percentageScale) {
  if (token.endsWith('%')) {
    const value = Number(token.slice(0, -1));
    return Number.isFinite(value) ? (value / 100) * percentageScale : null;
  }
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

function encodeChannel(linear) {
  const value = linear <= 0.0031308 ? 12.92 * linear : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(value * 255)));
}

function toHex(channels) {
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** OKLCh -> linear sRGB, per Björn Ottosson's OKLab definition. */
function oklchToLinearSrgb(lightness, chroma, hueDegrees) {
  const hue = (hueDegrees * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/**
 * @returns {{hex: string, inSrgbGamut: boolean} | null}
 *   null when the value is not a single literal color.
 */
export function resolveColor(value) {
  const input = value.trim();
  if (UNRESOLVABLE.test(input)) return null;

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join('') : hex[1];
    return { hex: `#${digits.toUpperCase()}`, inSrgbGamut: true };
  }

  const oklch = /^oklch\(\s*([^/)]+?)\s*\)$/i.exec(input);
  if (oklch) {
    const tokens = splitComponents(oklch[1]);
    if (!tokens) return null;
    const lightness = parseNumber(tokens[0], 1);
    const chroma = parseNumber(tokens[1], 0.4);
    const hue = parseAngle(tokens[2]);
    if (lightness === null || chroma === null || hue === null) return null;

    // CSS clamps both to their valid range at parse time, before conversion;
    // clipping the resulting RGB channels cannot undo an out-of-range input.
    const linear = oklchToLinearSrgb(Math.min(1, Math.max(0, lightness)), Math.max(0, chroma), hue);
    return {
      hex: toHex(linear.map(encodeChannel)),
      inSrgbGamut: linear.every((c) => c >= -EPSILON && c <= 1 + EPSILON),
    };
  }

  const rgb = /^rgba?\(\s*([^/)]+?)\s*\)$/i.exec(input);
  if (rgb) {
    const tokens = splitComponents(rgb[1], { commas: true });
    if (!tokens) return null;
    const channels = tokens.map((token) => parseNumber(token, 255));
    if (channels.some((c) => c === null)) return null;
    return {
      hex: toHex(channels.map((c) => Math.min(255, Math.max(0, Math.round(c))))),
      inSrgbGamut: channels.every((c) => c >= 0 && c <= 255),
    };
  }

  return null;
}
