/**
 * PDF Generator Utility
 * Generates A4 pages with 70×45mm QR cards tiled in a 3×6 grid with cut marks.
 * Layout: Text on left, QR on right (horizontal card).
 */
import { jsPDF } from 'jspdf';

// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

// Card dimensions in mm
const CARD_WIDTH = 70;
const CARD_HEIGHT = 45;

// Grid layout
const COLS = 3;
const ROWS = 6;
const CARDS_PER_PAGE = COLS * ROWS; // 18

// Margins & spacing (center the grid on A4)
const GRID_WIDTH = COLS * CARD_WIDTH; // 210mm — fits perfectly!
const GRID_HEIGHT = ROWS * CARD_HEIGHT; // 270mm
const MARGIN_LEFT = (A4_WIDTH - GRID_WIDTH) / 2; // 0mm
const MARGIN_TOP = (A4_HEIGHT - GRID_HEIGHT) / 2; // 13.5mm

// Cut mark length in mm
const CUT_MARK_LEN = 4;
const CUT_MARK_OFFSET = 1; // Gap between mark and card edge

interface QrCardData {
  uid: string;
  lotNumber: number;
  series?: string;
  points: number;
  claimUrl: string;
}

/**
 * Draws thin crop/cut marks at all grid intersections on the page.
 */
function drawCutMarks(doc: jsPDF) {
  doc.setDrawColor(140, 140, 140);
  doc.setLineWidth(0.15);

  // Draw marks at every grid intersection (including outer edges)
  for (let row = 0; row <= ROWS; row++) {
    for (let col = 0; col <= COLS; col++) {
      const x = MARGIN_LEFT + col * CARD_WIDTH;
      const y = MARGIN_TOP + row * CARD_HEIGHT;

      // Top mark (vertical line going up from intersection)
      if (row === 0) {
        doc.line(x, y - CUT_MARK_OFFSET - CUT_MARK_LEN, x, y - CUT_MARK_OFFSET);
      }
      // Bottom mark (vertical line going down from intersection)
      if (row === ROWS) {
        doc.line(x, y + CUT_MARK_OFFSET, x, y + CUT_MARK_OFFSET + CUT_MARK_LEN);
      }
      // Left mark (horizontal line going left from intersection)
      if (col === 0) {
        doc.line(x - CUT_MARK_OFFSET - CUT_MARK_LEN, y, x - CUT_MARK_OFFSET, y);
      }
      // Right mark (horizontal line going right from intersection)
      if (col === COLS) {
        doc.line(x + CUT_MARK_OFFSET, y, x + CUT_MARK_OFFSET + CUT_MARK_LEN, y);
      }

      // Internal intersection marks (short lines in all 4 directions)
      if (row > 0 && row < ROWS && col >= 0 && col <= COLS) {
        // Vertical marks at internal horizontal lines
        if (col === 0) {
          doc.line(x - CUT_MARK_OFFSET - CUT_MARK_LEN, y, x - CUT_MARK_OFFSET, y);
        }
        if (col === COLS) {
          doc.line(x + CUT_MARK_OFFSET, y, x + CUT_MARK_OFFSET + CUT_MARK_LEN, y);
        }
      }
      if (col > 0 && col < COLS && row >= 0 && row <= ROWS) {
        if (row === 0) {
          doc.line(x, y - CUT_MARK_OFFSET - CUT_MARK_LEN, x, y - CUT_MARK_OFFSET);
        }
        if (row === ROWS) {
          doc.line(x, y + CUT_MARK_OFFSET, x, y + CUT_MARK_OFFSET + CUT_MARK_LEN);
        }
      }
    }
  }

  // Draw light dashed grid lines for cutting guidance
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  // Use setLineDashPattern for dashed lines
  (doc as any).setLineDashPattern?.([1, 1], 0);

  // Horizontal lines (between rows)
  for (let row = 1; row < ROWS; row++) {
    const y = MARGIN_TOP + row * CARD_HEIGHT;
    doc.line(MARGIN_LEFT, y, MARGIN_LEFT + GRID_WIDTH, y);
  }

  // Vertical lines (between columns)
  for (let col = 1; col < COLS; col++) {
    const x = MARGIN_LEFT + col * CARD_WIDTH;
    doc.line(x, MARGIN_TOP, x, MARGIN_TOP + GRID_HEIGHT);
  }

  // Reset dash pattern
  (doc as any).setLineDashPattern?.([], 0);
}

export interface PdfGeneratorOptions {
  qrPosition?: 'left' | 'right';
}

/**
 * Renders a single 70×45mm card at the given position.
 * Layout: Left half = text info, Right half = QR code (or reversed if qrPosition === 'left')
 */
function drawCard(doc: jsPDF, card: QrCardData, x: number, y: number, options?: PdfGeneratorOptions) {
  const qrSize = 27; // QR code size in mm
  const padding = 3;
  const isQrLeft = options?.qrPosition === 'left';

  // --- CARD BORDER (light) ---
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT);

  // --- QR Code Placement ---
  const qrX = isQrLeft ? x + padding + 1 : x + CARD_WIDTH - padding - qrSize - 1;
  const qrY = y + 4.5;

  // QR border box
  doc.setDrawColor(225, 225, 225);
  doc.setLineWidth(0.15);
  doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1, 1);

  // Lot text formatting
  const formattedLot = String(card.lotNumber).padStart(3, '0');
  const seriesSuffix = card.series && card.series !== 'normal' ? ` (${card.series.toUpperCase()})` : '';
  const fullLotString = `LOT ${formattedLot}${seriesSuffix}`;

  // Prominent LOT label printed right below the QR code
  doc.setFontSize(7.5);
  doc.setTextColor(17, 53, 139); // #11358B brand blue
  doc.setFont('helvetica', 'bold');
  doc.text(fullLotString, qrX + qrSize / 2, qrY + qrSize + 4.5, { align: 'center' });

  // --- Text Content Placement ---
  const textX = isQrLeft ? x + qrSize + padding * 2 + 1 : x + padding;
  const textMaxWidth = CARD_WIDTH - qrSize - padding * 3 - 2;

  // Brand header - small blue bar
  doc.setFillColor(0, 120, 215); // #0078D7
  doc.roundedRect(textX, y + padding, textMaxWidth, 5.5, 1, 1, 'F');
  doc.setFontSize(5);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('QUICK SCAN REWARDS', textX + textMaxWidth / 2, y + padding + 3.8, { align: 'center' });

  // Points value
  doc.setFontSize(14);
  doc.setTextColor(251, 115, 78); // #FB734E
  doc.setFont('helvetica', 'bold');
  doc.text(`GET ${card.points}`, textX + 1, y + 17);
  doc.setFontSize(8);
  doc.text('POINTS!', textX + 1, y + 21.5);

  // "Scan To Claim" instruction
  doc.setFontSize(5.5);
  doc.setTextColor(29, 30, 107); // #1D1E6B
  doc.setFont('helvetica', 'bold');
  doc.text('SCAN TO CLAIM →', textX + 1, y + 27);

  // Divider line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);
  doc.line(textX, y + 31, textX + textMaxWidth, y + 31);

  // LOT number & ID in info block
  doc.setFontSize(6.5);
  doc.setTextColor(17, 53, 139);
  doc.setFont('helvetica', 'bold');
  doc.text(fullLotString, textX + 1, y + 35.5);

  doc.setFontSize(4.5);
  doc.setTextColor(140, 140, 140);
  doc.setFont('helvetica', 'normal');
  doc.text(`ID: ${card.uid.substring(0, 8)}`, textX + 1, y + 39.5);

  return { qrX, qrY, qrSize };
}

/**
 * Creates a QR code image data URL from text using a temporary canvas.
 */
async function generateQrDataUrl(text: string, size: number = 200): Promise<string> {
  // Dynamically import qrcode library to generate QR on canvas
  const QRCode = await import('qrcode');
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
  return canvas.toDataURL('image/png');
}

/**
 * Main export: generates a multi-page PDF with QR cards tiled on A4 pages.
 */
export async function generateQrPdf(cards: QrCardData[], options?: PdfGeneratorOptions): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const totalPages = Math.ceil(cards.length / CARDS_PER_PAGE);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      doc.addPage();
    }

    // Draw cut marks for this page
    drawCutMarks(doc);

    const startIdx = page * CARDS_PER_PAGE;
    const endIdx = Math.min(startIdx + CARDS_PER_PAGE, cards.length);

    for (let i = startIdx; i < endIdx; i++) {
      const card = cards[i];
      const posInPage = i - startIdx;
      const col = posInPage % COLS;
      const row = Math.floor(posInPage / COLS);

      const cardX = MARGIN_LEFT + col * CARD_WIDTH;
      const cardY = MARGIN_TOP + row * CARD_HEIGHT;

      // Draw card content (text)
      const { qrX, qrY, qrSize } = drawCard(doc, card, cardX, cardY, options);

      // Generate and place QR code image
      try {
        const qrDataUrl = await generateQrDataUrl(card.claimUrl, 300);
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      } catch (err) {
        console.error('QR generation failed for token:', card.uid, err);
        // Draw placeholder box
        doc.setFillColor(245, 245, 245);
        doc.rect(qrX, qrY, qrSize, qrSize, 'F');
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text('QR Error', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });
      }
    }

    // Page footer
    doc.setFontSize(5);
    doc.setTextColor(180, 180, 180);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${page + 1} of ${totalPages}  •  Quick Scan Rewards  •  ${new Date().toLocaleDateString('en-IN')}`,
      A4_WIDTH / 2,
      A4_HEIGHT - 3,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

/**
 * Calculates a clean filename based on lot numbers:
 * - Single QR: "Lot_1001.pdf"
 * - Multiple QRs: "Lot_1001-1050.pdf"
 */
export function getDefaultPdfFileName(cards: QrCardData[]): string {
  const lotNumbers = cards
    .map((c) => Number(c.lotNumber))
    .filter((n) => !isNaN(n) && n > 0)
    .sort((a, b) => a - b);

  if (lotNumbers.length === 0) return 'Lot_QR.pdf';
  const minLot = lotNumbers[0];
  const maxLot = lotNumbers[lotNumbers.length - 1];
  return minLot === maxLot ? `Lot_${minLot}.pdf` : `Lot_${minLot}-${maxLot}.pdf`;
}

/**
 * Triggers browser download of the generated PDF.
 */
export async function downloadQrPdf(
  cards: QrCardData[],
  fileName?: string,
  options?: PdfGeneratorOptions
): Promise<void> {
  const blob = await generateQrPdf(cards, options);
  const resolvedFileName = fileName || getDefaultPdfFileName(cards);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = resolvedFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * For native (Capacitor) platforms, share the PDF.
 */
export async function shareQrPdf(
  cards: QrCardData[],
  fileName?: string,
  options?: PdfGeneratorOptions
): Promise<void> {
  const blob = await generateQrPdf(cards, options);
  const resolvedFileName = fileName || getDefaultPdfFileName(cards);

  // Convert blob to base64
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
  });
  reader.readAsDataURL(blob);
  const base64Data = await base64Promise;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      const savedFile = await Filesystem.writeFile({
        path: resolvedFileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: resolvedFileName.replace('.pdf', ''),
        text: 'Here are the generated QR code cards for printing.',
        url: savedFile.uri,
        dialogTitle: 'Share QR Cards PDF',
      });
      return;
    }
  } catch (e) {
    console.warn('Native sharing failed, falling back to download', e);
  }

  // Fallback to download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = resolvedFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

