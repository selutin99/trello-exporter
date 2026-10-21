import pdfMake from 'pdfmake/build/pdfmake';
import vfs from 'pdfmake/build/vfs_fonts';
import fontkit from '@pdf-lib/fontkit';
import type { Font } from '@pdf-lib/fontkit';
import japaneseUrl from '@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff?url';
import symbolsUrl from '@fontsource/noto-sans-symbols-2/files/noto-sans-symbols-2-symbols-400-normal.woff?url';
import { FormatError, FormatErrorCode } from './errors';

enum PdfFont {
  Roboto = 'Roboto',
  Japanese = 'NotoJapanese',
  Symbols = 'NotoSymbols',
}
interface FontFace {
  name: PdfFont;
  font: Font;
}
export interface FontRun {
  text: string;
  font: string;
}
let loaded: Promise<FontFace[]> | null = null;

function decode(encoded: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
}
function encode(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(binary);
}
async function bundledFont(name: PdfFont, url: string): Promise<FontFace> {
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) throw new FormatError(FormatErrorCode.FontUnavailable);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const filename = `${name}.woff`;
  pdfMake.addVirtualFileSystem({ [filename]: encode(bytes) });
  pdfMake.addFonts({
    [name]: { normal: filename, bold: filename, italics: filename, bolditalics: filename },
  });
  return { name, font: fontkit.create(bytes) };
}

/**
 * Loads bundled fonts once without sending credentials or board data
 * @returns The registered, inspected font faces
 * @throws Error when local font assets cannot be loaded
 */
export async function pdfFonts(): Promise<FontFace[]> {
  const roboto = vfs['Roboto-Regular.ttf'];
  if (!roboto) throw new FormatError(FormatErrorCode.FontUnavailable);
  loaded ??= Promise.all([
    Promise.resolve({
      name: PdfFont.Roboto,
      font: fontkit.create(decode(roboto)),
    }),
    bundledFont(PdfFont.Japanese, japaneseUrl),
    bundledFont(PdfFont.Symbols, symbolsUrl),
  ]).catch((error: unknown) => {
    loaded = null;
    throw error;
  });
  return loaded;
}

/**
 * Selects a real glyph for every character and visibly preserves unsupported Unicode as code points
 * @param value - Literal source text
 * @param fonts - Successfully loaded font registry
 * @returns Grouped font runs and whether code point notation was needed
 */
export function pdfText(value: string, fonts: FontFace[]): { runs: FontRun[]; fallback: boolean } {
  const runs: FontRun[] = [];
  const coverage = new Map<number, PdfFont | undefined>();
  let fallback = false;
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (!coverage.has(code))
      coverage.set(code, fonts.find((face) => face.font.hasGlyphForCodePoint(code))?.name);
    let family = coverage.get(code);
    let text = char;
    if (/^[\n\r\t]$/.test(char)) family = PdfFont.Roboto;
    if (!family) {
      family = PdfFont.Roboto;
      text = `[U+${code.toString(16).toUpperCase()}]`;
      fallback = true;
    }
    const previous = runs.at(-1);
    if (previous?.font === family) previous.text += text;
    else runs.push({ text, font: family });
  }
  return { runs, fallback };
}
pdfMake.addVirtualFileSystem(vfs);
