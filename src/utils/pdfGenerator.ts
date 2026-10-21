import { jsPDF } from 'jspdf';
import { BillData, DocProject } from '../types';

/**
 * Generates an A4 PDF matching the user's reference template layout (Sai AC Services Tax Invoice)
 */
export function generateBillPdf(bill: BillData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Outer border
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.35);
  doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);

  // Top Title Banner
  const titleBannerHeight = 14;
  doc.setFillColor(235, 240, 248);
  doc.rect(margin, margin, contentWidth, titleBannerHeight, 'F');
  doc.line(margin, margin + titleBannerHeight, margin + contentWidth, margin + titleBannerHeight);

  // Vertical divider between Title and Invoice No/Date
  const rightBoxWidth = 50;
  const dividerX = margin + contentWidth - rightBoxWidth;
  doc.line(dividerX, margin, dividerX, margin + titleBannerHeight);

  // "TAX INVOICE" or "INVOICE"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(bill.company.isGst ? 'TAX INVOICE' : 'INVOICE', margin + (contentWidth - rightBoxWidth) / 2, margin + 9, { align: 'center' });

  // Invoice No & Date
  doc.setFontSize(8);
  doc.text(`INVOICE NO : ${bill.invoiceNo || 'N/A'}`, dividerX + 3, margin + 5.5);
  doc.text(`DATE : ${bill.date || 'N/A'}`, dividerX + 3, margin + 10.5);

  // Company Details Block
  let currentY = margin + titleBannerHeight + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text((bill.company.name || 'COMPANY NAME').toUpperCase(), margin + contentWidth / 2, currentY, { align: 'center' });

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text(bill.company.address || '', margin + contentWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;
  if (bill.company.isGst) {
    const regParts: string[] = [];
    if (bill.company.gstin) regParts.push(`GSTIN: ${bill.company.gstin}`);
    if (bill.company.msme) regParts.push(`MSME Registration No.:-${bill.company.msme}`);
    doc.text(regParts.join('  |  '), margin + contentWidth / 2, currentY, { align: 'center' });
    currentY += 4;
  }

  if (bill.company.mobile) {
    doc.text(`Mobile No.: ${bill.company.mobile}`, margin + contentWidth / 2, currentY, { align: 'center' });
  }

  // Divider above Party Details
  currentY += 4;
  doc.line(margin, currentY, margin + contentWidth, currentY);

  // Party Details Section
  const partyStartY = currentY;
  const partySectionHeight = 22;
  currentY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text("PARTY'S NAME:-", margin + 3, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(bill.partyName || 'Party Name', margin + 3, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (bill.siteAddress) {
    doc.text(bill.siteAddress, margin + 3, currentY);
  }

  currentY += 4;
  if (bill.partyGstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GST NO:- ${bill.partyGstin}`, margin + 3, currentY);
  }

  const tableStartY = partyStartY + partySectionHeight;
  doc.line(margin, tableStartY, margin + contentWidth, tableStartY);

  // Items Table Header
  const tableHeaderHeight = 9;
  const colParticulars = 85;
  const colHsn = 25;
  const colQty = 22;
  const colRate = 22;
  const colAmount = 28;

  const colX0 = margin;
  const colX1 = colX0 + colParticulars;
  const colX2 = colX1 + colHsn;
  const colX3 = colX2 + colQty;
  const colX4 = colX3 + colRate;
  const colX5 = margin + contentWidth;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, tableStartY, contentWidth, tableHeaderHeight, 'F');
  doc.line(margin, tableStartY + tableHeaderHeight, margin + contentWidth, tableStartY + tableHeaderHeight);

  // Table column vertical lines
  doc.line(colX1, tableStartY, colX1, tableStartY + tableHeaderHeight);
  doc.line(colX2, tableStartY, colX2, tableStartY + tableHeaderHeight);
  doc.line(colX3, tableStartY, colX3, tableStartY + tableHeaderHeight);
  doc.line(colX4, tableStartY, colX4, tableStartY + tableHeaderHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Particulars (Descriptions & Specifications)', colX0 + 2, tableStartY + 5.5);
  doc.text('HSN Code', colX1 + colHsn / 2, tableStartY + 5.5, { align: 'center' });
  doc.text('Qty', colX2 + colQty / 2, tableStartY + 5.5, { align: 'center' });
  doc.text('Rate', colX3 + colRate / 2, tableStartY + 5.5, { align: 'center' });
  doc.text('Amount', colX4 + colAmount / 2, tableStartY + 5.5, { align: 'center' });

  // Table Items Rows
  let rowY = tableStartY + tableHeaderHeight;
  const rowHeight = 8;
  const tableBottomY = tableStartY + 95; // Fixed height table area matching template

  bill.items.forEach((item, index) => {
    if (rowY + rowHeight <= tableBottomY) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      // 1. Description
      const desc = `${index + 1}. ${item.particulars}`;
      doc.text(desc.substring(0, 48), colX0 + 2, rowY + 5);

      // HSN
      doc.text(item.hsnCode || '-', colX1 + colHsn / 2, rowY + 5, { align: 'center' });

      // Qty
      doc.text(item.qty || '-', colX2 + colQty / 2, rowY + 5, { align: 'center' });

      // Rate
      doc.text((Number(item.rate) || 0).toFixed(0), colX3 + colRate - 2, rowY + 5, { align: 'right' });

      // Amount
      doc.text((Number(item.amount) || 0).toFixed(2), colX4 + colAmount - 2, rowY + 5, { align: 'right' });

      rowY += rowHeight;
    }
  });

  // Vertical lines extending through table
  doc.line(colX1, tableStartY + tableHeaderHeight, colX1, tableBottomY);
  doc.line(colX2, tableStartY + tableHeaderHeight, colX2, tableBottomY);
  doc.line(colX3, tableStartY + tableHeaderHeight, colX3, tableBottomY);
  doc.line(colX4, tableStartY + tableHeaderHeight, colX4, tableBottomY);

  // Table bottom border
  doc.line(margin, tableBottomY, margin + contentWidth, tableBottomY);

  // Subtotal row on the right
  const subtotalRowHeight = 7;
  doc.line(colX3, tableBottomY, colX5, tableBottomY);
  doc.line(colX3, tableBottomY + subtotalRowHeight, colX5, tableBottomY + subtotalRowHeight);
  doc.line(colX4, tableBottomY, colX4, tableBottomY + subtotalRowHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Total', colX3 + 2, tableBottomY + 5);
  doc.text((Number(bill.subtotal) || 0).toFixed(2), colX4 + colAmount - 2, tableBottomY + 5, { align: 'right' });

  // Bank Details Block & Tax Breakdown Block
  const lowerBlockStartY = tableBottomY + subtotalRowHeight;
  const taxBlockWidth = 72;
  const bankBlockWidth = contentWidth - taxBlockWidth;
  const lowerBlockDividerX = margin + bankBlockWidth;

  const lowerBlockHeight = 28;
  doc.line(lowerBlockDividerX, tableBottomY, lowerBlockDividerX, lowerBlockStartY + lowerBlockHeight);
  doc.line(margin, lowerBlockStartY + lowerBlockHeight, margin + contentWidth, lowerBlockStartY + lowerBlockHeight);

  // Bank details inside left box
  let bankY = lowerBlockStartY + 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BANK DETAILS:', margin + 3, bankY);

  bankY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank Name: ${bill.company.bankName || 'N/A'}`, margin + 3, bankY);
  bankY += 4;
  doc.text(`A/C No: ${bill.company.accountNo || 'N/A'}`, margin + 3, bankY);
  bankY += 4;
  doc.text(`Branch: ${bill.company.branch || 'N/A'}`, margin + 3, bankY);
  bankY += 4;
  doc.text(`IFSC Code: ${bill.company.ifsc || 'N/A'}`, margin + 3, bankY);

  // Tax Breakdown inside right box
  let taxY = lowerBlockStartY;
  const taxColValX = margin + contentWidth - 2;
  const taxColMidX = lowerBlockDividerX + 44;

  if (bill.company.isGst) {
    // Divider between CGST label and amount
    doc.line(taxColMidX, taxY, taxColMidX, taxY + lowerBlockHeight - 8);

    // Add CGST
    taxY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Add : CGST @ ${bill.cgstPercent}%`, lowerBlockDividerX + 2, taxY);
    doc.text((Number(bill.cgstAmount) || 0).toFixed(2), taxColValX, taxY, { align: 'right' });

    taxY += 5;
    doc.line(lowerBlockDividerX, taxY - 1, margin + contentWidth, taxY - 1);
    doc.text(`Add : SGST @ ${bill.sgstPercent}%`, lowerBlockDividerX + 2, taxY + 3);
    doc.text((Number(bill.sgstAmount) || 0).toFixed(2), taxColValX, taxY + 3, { align: 'right' });
    taxY += 8.5;
  }

  // Grand Total highlight row sits at the bottom of the lower block
  taxY = lowerBlockStartY + lowerBlockHeight - 10;
  doc.line(lowerBlockDividerX, taxY, margin + contentWidth, taxY);

  // Grand Total highlight row
  doc.setFillColor(225, 235, 248);
  doc.rect(lowerBlockDividerX, taxY, taxBlockWidth, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total', lowerBlockDividerX + 3, taxY + 6.5);
  doc.text(`₹ ${(Number(bill.grandTotal) || 0).toFixed(2)}`, taxColValX, taxY + 6.5, { align: 'right' });

  // Total Amount in Words Banner
  const wordsY = lowerBlockStartY + lowerBlockHeight;
  const wordsBannerHeight = 8;
  doc.line(margin, wordsY + wordsBannerHeight, margin + contentWidth, wordsY + wordsBannerHeight);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(7.8);
  doc.text(
    `Total Amount (INR - In Words): ${bill.amountInWords || 'Zero Rupees Only.'}`,
    margin + 3,
    wordsY + 5.5
  );

  // Footer Signatory Section
  const signY = wordsY + wordsBannerHeight + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`FOR ${bill.company.name || 'COMPANY'}`, margin + 3, signY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Authorized Signatory', margin + 3, signY + 22);

  return doc;
}

/**
 * Generates Multi-Page Image + Text Document as PDF
 */
export async function generateDocProjectPdf(project: DocProject): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const printableWidth = pageWidth - margin * 2;

  for (let i = 0; i < project.pages.length; i++) {
    const page = project.pages[i];
    if (i > 0) doc.addPage();

    // Page Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(project.title || 'Site Documentation Report', margin, margin + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${i + 1} of ${project.pages.length} · ${project.date || new Date().toLocaleDateString()}`, pageWidth - margin, margin + 4, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, margin + 7, pageWidth - margin, margin + 7);

    // Section title
    let contentY = margin + 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(page.title || `Section / Photo ${i + 1}`, margin, contentY);

    contentY += 4;

    // Image
    if (page.imageDataUrl) {
      const imgHeight = 150;
      try {
        const isPng = page.imageDataUrl.includes('image/png');
        const isWebp = page.imageDataUrl.includes('image/webp');
        const format = isPng ? 'PNG' : isWebp ? 'WEBP' : 'JPEG';
        doc.addImage(
          page.imageDataUrl,
          format,
          margin,
          contentY,
          printableWidth,
          imgHeight,
          undefined,
          'FAST'
        );
      } catch (imgErr) {
        try {
          doc.addImage(
            page.imageDataUrl,
            margin,
            contentY,
            printableWidth,
            imgHeight
          );
        } catch (fallbackErr) {
          console.warn('Failed to embed image into PDF:', fallbackErr);
        }
      }

      // Render annotations over image
      if (page.annotations && page.annotations.length > 0) {
        page.annotations.forEach((annot) => {
          const annotX = margin + (annot.xPercent / 100) * printableWidth;
          const annotY = contentY + (annot.yPercent / 100) * imgHeight;

          // Background pill / badge in unified blue
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          const txtWidth = doc.getTextWidth(annot.text) + 6;

          doc.setFillColor(37, 99, 235); // Clean professional blue
          doc.rect(annotX - 3, annotY - 4.5, txtWidth, 6, 'F');
          doc.setTextColor(255, 255, 255);
          doc.text(annot.text, annotX, annotY - 0.5);
        });
      }

      contentY += imgHeight + 6;
    }

    // Caption & Detailed text notes
    if (page.caption) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const splitCaption = doc.splitTextToSize(`Notes: ${page.caption}`, printableWidth);
      doc.text(splitCaption, margin, contentY);
      contentY += splitCaption.length * 5 + 3;
    }

    // Annotations table / list summary below image
    if (page.annotations && page.annotations.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Key Observations & Work Items:', margin, contentY);
      contentY += 4.5;

      page.annotations.forEach((annot, idx) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(`• ${annot.text}`, margin + 2, contentY);
        contentY += 4;
      });
    }

    // Page Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${project.companyName || 'Patraka DocCraft'} · Confidential & Proprietary`,
      margin,
      pageHeight - margin
    );
  }

  return doc;
}
