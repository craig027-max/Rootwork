/**
 * One-page PDF of a receipt. Helvetica, WinAnsi. No network and no app import.
 */
import { receiptLines, type Receipt } from './receipt';

const SAMPLE_BANNER = 'SAMPLE — NOT A REAL PURCHASE. Fake example data. Not a charge.';

function pdfLiteral(text: string): string {
  let out = '(';
  for (const ch of text) {
    let byte: number;
    if (ch === '—') byte = 0x97;
    else if (ch === '’') byte = 0x92;
    else if (ch.codePointAt(0)! <= 126 && ch.codePointAt(0)! >= 32) byte = ch.codePointAt(0)!;
    else throw new Error(`receipt text has a character the PDF font cannot print: ${ch}`);
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out += `\\${String.fromCharCode(byte)}`;
    else if (byte > 126) out += `\\${byte.toString(8).padStart(3, '0')}`;
    else out += String.fromCharCode(byte);
  }
  return `${out})`;
}

export function receiptToPdf(receipt: Receipt, options?: { sample?: boolean }): Uint8Array {
  const lines = options?.sample ? [SAMPLE_BANNER, ...receiptLines(receipt)] : receiptLines(receipt);
  const stream = lines
    .map((line, index) => {
      const y = 740 - index * 16;
      return `BT /F1 10 Tf 54 ${y} Td ${pdfLiteral(line)} Tj ET`;
    })
    .join('\n');
  const objects = [
    '',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = body.length;
    body += objects[i];
  }
  const xrefAt = body.length;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return new TextEncoder().encode(body + xref);
}

/** Pull the printed lines back out of a receipt PDF. Used by tests and the sample check. */
export function pdfTextLines(bytes: Uint8Array): string[] {
  const raw = new TextDecoder('latin1').decode(bytes);
  const lines: string[] = [];
  const re = /\((?:\\[0-7]{3}|\\.|[^\\)])*\) Tj/g;
  for (const match of raw.matchAll(re)) {
    lines.push(decodeLiteral(match[0].slice(1, match[0].length - 4)));
  }
  return lines;
}

function decodeLiteral(body: string): string {
  let out = '';
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '\\') {
      out += body[i];
      continue;
    }
    const oct = body.slice(i + 1, i + 4);
    if (/^[0-7]{3}$/.test(oct)) {
      const byte = Number.parseInt(oct, 8);
      out += byte === 0x97 ? '—' : byte === 0x92 ? '’' : String.fromCharCode(byte);
      i += 3;
      continue;
    }
    out += body[i + 1] ?? '';
    i += 1;
  }
  return out;
}
