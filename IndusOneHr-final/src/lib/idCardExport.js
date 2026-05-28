import { toPng } from 'html-to-image';

const sanitizeFileName = (rawName, fallback) => {
    const safe = String(rawName || '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^A-Za-z0-9_-]/g, '');
    return safe || fallback;
};

export const downloadIdCardPdf = async ({ node, fullName, fallbackName = 'Employee' }) => {
    if (!node) throw new Error('ID card element not found');

    const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#ffffff'
    });

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const cardWidthPx = Math.max(1, node.offsetWidth || 320);
    const cardHeightPx = Math.max(1, node.offsetHeight || 500);
    const cardRatio = cardWidthPx / cardHeightPx;

    const margin = 12;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    let renderWidth = maxWidth;
    let renderHeight = renderWidth / cardRatio;

    if (renderHeight > maxHeight) {
        renderHeight = maxHeight;
        renderWidth = renderHeight * cardRatio;
    }

    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    pdf.addImage(dataUrl, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');

    const fileName = sanitizeFileName(fullName, fallbackName);
    pdf.save(`ID_Card_${fileName}.pdf`);
};
