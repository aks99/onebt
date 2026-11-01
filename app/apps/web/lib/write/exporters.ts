import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { ScriptDoc, OutlineDoc, ClaimRow } from "./rules";
import { CLAIM_STATUS_LABEL, formatClock, wordsIn } from "./rules";

// Exports (F2.11, F1.3.12): speaker script PDF in large type with section headers and cue marks, DOCX,
// plain text, the annotated fact-check PDF, the outline PDF, and the application record PDF and DOCX.
// Text only; nothing here embeds media.

const PAGE = { w: 595.28, h: 841.89, margin: 56 };   // A4 points

async function pdfFrom(blocks: { kind: "title" | "h" | "p" | "cue" | "small"; text: string }[], footer: string) {
  const pdf = await PDFDocument.create();
  const [body, bold] = await Promise.all([pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold)]);
  let page = pdf.addPage([PAGE.w, PAGE.h]); let y = PAGE.h - PAGE.margin;
  const maxW = PAGE.w - PAGE.margin * 2;
  const newPage = () => { page = pdf.addPage([PAGE.w, PAGE.h]); y = PAGE.h - PAGE.margin; };
  const wrap = (text: string, font: typeof body, size: number) => {
    const lines: string[] = []; for (const para of text.split("\n")) { let line = "";
      for (const w of para.split(/\s+/)) { const t = line ? `${line} ${w}` : w; if (font.widthOfTextAtSize(t, size) > maxW && line) { lines.push(line); line = w; } else line = t; }
      lines.push(line); }
    return lines;
  };
  for (const b of blocks) {
    const size = b.kind === "title" ? 22 : b.kind === "h" ? 15 : b.kind === "small" ? 9 : b.kind === "cue" ? 12 : 16;   // large type for the speaker script
    const font = b.kind === "title" || b.kind === "h" ? bold : body; const lead = size * 1.45;
    if (b.kind === "h") y -= 10;
    for (const line of wrap(b.text, font, size)) {
      if (y < PAGE.margin + lead) newPage();
      page.drawText(line, { x: PAGE.margin, y, size, font, color: b.kind === "cue" || b.kind === "small" ? rgb(0.42, 0.4, 0.38) : rgb(0.1, 0.1, 0.12) });
      y -= lead;
    }
    y -= size * 0.5;
  }
  for (const p of pdf.getPages()) p.drawText(footer, { x: PAGE.margin, y: 28, size: 8, font: body, color: rgb(0.5, 0.5, 0.5) });
  return Buffer.from(await pdf.save());
}

export async function scriptPdf(title: string, doc: ScriptDoc, meta: { slotMinutes: number; wpm: number; version: number; locked: boolean }, footer: string) {
  const blocks: Parameters<typeof pdfFrom>[0] = [{ kind: "title", text: title }, { kind: "small", text: `Version ${meta.version}${meta.locked ? ", locked" : ""} · ${meta.slotMinutes}-minute slot · ${wordsIn(doc.sections.map((s) => s.text).join(" "))} words at ${meta.wpm} wpm` }];
  let t = 0;
  for (const s of doc.sections) {
    blocks.push({ kind: "h", text: `${s.title}` }, { kind: "cue", text: `cue ${formatClock(t)} · ${wordsIn(s.text)} words · about ${formatClock(Math.round((wordsIn(s.text) / meta.wpm) * 60))}` });
    t += Math.round((wordsIn(s.text) / meta.wpm) * 60);
    blocks.push({ kind: "p", text: s.text.trim() });
    if (s.ending_point) blocks.push({ kind: "cue", text: "ENDING POINT: you can stop here if you are running long." });
  }
  return pdfFrom(blocks, footer);
}

export async function outlinePdf(title: string, outline: OutlineDoc, footer: string) {
  const blocks: Parameters<typeof pdfFrom>[0] = [{ kind: "title", text: `${title}: outline` }];
  for (const s of outline.sections) {
    blocks.push({ kind: "h", text: `${s.kind.toUpperCase()} · ${s.purpose}` }, { kind: "cue", text: `${formatClock(s.target_seconds)} · about ${s.target_words} words${s.ending_point ? " · ending point" : ""}` });
    for (const p of s.talking_points) blocks.push({ kind: "p", text: `${p.kind === "to_find" ? "[to find] " : p.kind === "story" ? `[story, ${p.consent.replace(/_/g, " ")}] ` : ""}${p.text}` });
  }
  return pdfFrom(blocks, footer);
}

export async function factcheckPdf(title: string, doc: ScriptDoc, claims: ClaimRow[], footer: string) {
  const blocks: Parameters<typeof pdfFrom>[0] = [{ kind: "title", text: `${title}: fact-check sheet` }, { kind: "small", text: `${claims.length} checkable claims. Fact-checking takes 2 to 12 hours; start early. "Cure" and "heal" must become "reduce the risk of".` }];
  for (const s of doc.sections) {
    const mine = claims.filter((c) => c.section_id === s.id); if (!mine.length) continue;
    blocks.push({ kind: "h", text: s.title });
    for (const c of mine) blocks.push({ kind: "p", text: `${c.text}` }, { kind: "cue", text: `${CLAIM_STATUS_LABEL[c.status] ?? c.status}${c.risk ? ` · ${c.risk} risk` : ""}${c.r5_flag ? " · R5 health wording" : ""}${c.overclaim_flag ? " · overclaim word" : ""}${c.source_url ? ` · ${c.source_url}` : ""}${c.note ? ` · ${c.note}` : ""}` });
  }
  return pdfFrom(blocks, footer);
}

export async function scriptDocx(title: string, doc: ScriptDoc, meta: { version: number; locked: boolean }) {
  const children: Paragraph[] = [new Paragraph({ text: title, heading: HeadingLevel.TITLE }), new Paragraph({ children: [new TextRun({ text: `Version ${meta.version}${meta.locked ? ", locked" : ""}`, color: "6B6560", size: 20 })] })];
  for (const s of doc.sections) {
    children.push(new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_1 }));
    for (const para of s.text.trim().split(/\n{2,}/)) children.push(new Paragraph({ children: [new TextRun({ text: para.trim(), size: 28 })], spacing: { after: 240 } }));
    if (s.ending_point) children.push(new Paragraph({ children: [new TextRun({ text: "ENDING POINT: you can stop here if you are running long.", italics: true, color: "6B6560" })] }));
  }
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children }] })));
}

export async function recordPdf(title: string, lines: { label: string; text: string }[], footer: string) {
  const blocks: Parameters<typeof pdfFrom>[0] = [{ kind: "title", text: title }];
  for (const l of lines) blocks.push({ kind: "h", text: l.label }, { kind: "p", text: l.text });
  return pdfFrom(blocks, footer);
}
export async function recordDocx(title: string, lines: { label: string; text: string }[]) {
  const children: Paragraph[] = [new Paragraph({ text: title, heading: HeadingLevel.TITLE })];
  for (const l of lines) { children.push(new Paragraph({ text: l.label, heading: HeadingLevel.HEADING_2 })); for (const para of l.text.split(/\n{2,}/)) children.push(new Paragraph({ children: [new TextRun({ text: para.trim(), size: 24 })], spacing: { after: 200 } })); }
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children }] })));
}
