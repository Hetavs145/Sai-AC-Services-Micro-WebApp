import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
} from 'docx';
import { BillData, DocProject } from '../types';

/**
 * Converts a base64 data URL to an ArrayBuffer for docx image embed
 */
function dataUrlToArrayBuffer(dataUrl: string): Uint8Array | null {
  try {
    const base64 = dataUrl.split(',')[1];
    if (!base64) return null;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Generates an editable Microsoft Word (.docx) Tax Invoice
 */
export async function generateBillDocx(bill: BillData): Promise<Blob> {
  const tableRows: TableRow[] = [
    // Header
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: 'Particulars (Descriptions & Specifications)', bold: true })] })],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HSN Code', bold: true })] })],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Qty', bold: true })] })],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Rate', bold: true })] })],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Amount', bold: true })] })],
        }),
      ],
    }),
  ];

  // Items
  bill.items.forEach((item, index) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun(`${index + 1}. ${item.particulars}`)] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(item.hsnCode || '-')] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(item.qty || '-')] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun((Number(item.rate) || 0).toFixed(0))] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun((Number(item.amount) || 0).toFixed(2))] })],
          }),
        ],
      })
    );
  });

  // Subtotal
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Total', bold: true })] })],
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: (Number(bill.subtotal) || 0).toFixed(2), bold: true })] })],
        }),
      ],
    })
  );

  // CGST
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(`Add: CGST @ ${bill.cgstPercent}%`)] })],
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun((Number(bill.cgstAmount) || 0).toFixed(2))] })],
        }),
      ],
    })
  );

  // SGST
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(`Add: SGST @ ${bill.sgstPercent}%`)] })],
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun((Number(bill.sgstAmount) || 0).toFixed(2))] })],
        }),
      ],
    })
  );

  // Grand Total
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Grand Total', bold: true, size: 24 })] })],
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₹ ${(Number(bill.grandTotal) || 0).toFixed(2)}`, bold: true, size: 24 })] })],
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: 'TAX INVOICE', bold: true, size: 32 })],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Invoice No: ${bill.invoiceNo}    Date: ${bill.date}`, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: bill.company.name, bold: true, size: 28 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: bill.company.address, size: 18 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `GSTIN: ${bill.company.gstin} | MSME: ${bill.company.msme} | Mobile: ${bill.company.mobile}`, size: 18 }),
            ],
          }),
          new Paragraph({ children: [new TextRun('')] }),
          new Paragraph({
            children: [
              new TextRun({ text: "PARTY'S NAME: ", bold: true }),
              new TextRun({ text: bill.partyName }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Site Address: ', bold: true }),
              new TextRun({ text: bill.siteAddress }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'GST No: ', bold: true }),
              new TextRun({ text: bill.partyGstin || '-' }),
            ],
          }),
          new Paragraph({ children: [new TextRun('')] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
          new Paragraph({ children: [new TextRun('')] }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Total Amount (INR - In Words): ', bold: true, italics: true }),
              new TextRun({ text: bill.amountInWords, italics: true }),
            ],
          }),
          new Paragraph({ children: [new TextRun('')] }),
          new Paragraph({
            children: [new TextRun({ text: 'BANK DETAILS:', bold: true })],
          }),
          new Paragraph({
            children: [new TextRun(`Bank: ${bill.company.bankName} | A/C: ${bill.company.accountNo} | Branch: ${bill.company.branch} | IFSC: ${bill.company.ifsc}`)],
          }),
          new Paragraph({ children: [new TextRun('')] }),
          new Paragraph({
            children: [new TextRun({ text: `FOR ${bill.company.name}`, bold: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Authorized Signatory', italics: true })],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generates an editable Microsoft Word (.docx) document from photos + text annotations
 */
export async function generateDocProjectDocx(project: DocProject): Promise<Blob> {
  const sectionsChildren: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: project.title || 'Photo Documentation Report', bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Company: ${project.companyName || 'Patraka DocCraft'} · Date: ${project.date || new Date().toLocaleDateString()}` }),
      ],
    }),
    new Paragraph({ children: [new TextRun('')] }),
  ];

  project.pages.forEach((page, idx) => {
    sectionsChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: `Page ${idx + 1}: ${page.title || `Observation ${idx + 1}`}`, bold: true, size: 24 })],
      })
    );

    if (page.caption) {
      sectionsChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Notes: ', bold: true }),
            new TextRun({ text: page.caption, italics: true }),
          ],
        })
      );
    }

    if (page.annotations && page.annotations.length > 0) {
      sectionsChildren.push(
        new Paragraph({
          children: [new TextRun({ text: 'Annotations & Tagged Requirements:', bold: true })],
        })
      );
      page.annotations.forEach((annot) => {
        sectionsChildren.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: annot.text })],
          })
        );
      });
    }

    sectionsChildren.push(new Paragraph({ children: [new TextRun('')] }));
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sectionsChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
