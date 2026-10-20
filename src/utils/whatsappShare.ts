import { BillData, DocProject } from '../types';

export function getBillWhatsAppText(bill: BillData): string {
  const lines = [
    `🧾 *TAX INVOICE #${bill.invoiceNo || 'N/A'}*`,
    `🏢 *From:* ${bill.company.name}`,
    `👤 *Bill To:* ${bill.partyName}`,
    bill.siteAddress ? `📍 *Site:* ${bill.siteAddress}` : '',
    `📅 *Date:* ${bill.date}`,
    `--------------------------------`,
    `*Items Summary:*`,
    ...bill.items.map(
      (item, idx) => `${idx + 1}. ${item.particulars} (${item.qty} @ ₹${item.rate}) = ₹${item.amount}`
    ),
    `--------------------------------`,
    `*Subtotal:* ₹${bill.subtotal.toFixed(2)}`,
    bill.cgstAmount ? `*CGST (${bill.cgstPercent}%):* ₹${bill.cgstAmount.toFixed(2)}` : '',
    bill.sgstAmount ? `*SGST (${bill.sgstPercent}%):* ₹${bill.sgstAmount.toFixed(2)}` : '',
    `💰 *Grand Total:* ₹${bill.grandTotal.toFixed(2)}`,
    `📝 *In Words:* ${bill.amountInWords}`,
    `--------------------------------`,
    `*Bank Details:*`,
    `A/C: ${bill.company.accountNo} (${bill.company.bankName})`,
    `IFSC: ${bill.company.ifsc}`,
    `_Generated via Patraka Bill & DocCraft_`,
  ].filter(Boolean);

  return lines.join('\n');
}

export function shareBillViaWhatsApp(bill: BillData, pdfBlob?: Blob) {
  const text = getBillWhatsAppText(bill);
  
  // Try navigator.share with file if available
  if (navigator.share && pdfBlob && navigator.canShare) {
    const file = new File([pdfBlob], `Invoice_${bill.invoiceNo}_${bill.partyName.replace(/\s+/g, '_')}.pdf`, {
      type: 'application/pdf',
    });
    if (navigator.canShare({ files: [file] })) {
      navigator
        .share({
          title: `Invoice #${bill.invoiceNo} - ${bill.company.name}`,
          text,
          files: [file],
        })
        .catch(() => {
          // fallback to wa.me URL
          openWhatsAppWeb(text);
        });
      return;
    }
  }

  openWhatsAppWeb(text);
}

export function shareDocProjectViaWhatsApp(project: DocProject) {
  const lines = [
    `📸 *Photo Documentation Report*`,
    `📁 *Project:* ${project.title}`,
    `🏢 *Company:* ${project.companyName || 'Patraka'}`,
    `📅 *Date:* ${project.date}`,
    `📄 *Pages / Photos:* ${project.pages.length}`,
    `--------------------------------`,
    ...project.pages.map((p, idx) => {
      const annotCount = p.annotations?.length || 0;
      return `Page ${idx + 1}: ${p.title || 'Photo'} (${annotCount} items tagged)`;
    }),
    `--------------------------------`,
    `_Generated via Patraka Bill & DocCraft_`,
  ];

  openWhatsAppWeb(lines.join('\n'));
}

function openWhatsAppWeb(text: string) {
  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}
