import { jsPDF } from "jspdf";

export default defineBackground(() => {

const frames = [];

async function framesToPDF(quality = 0.9) {
    const firstBlob = await fetch(frames[0]).then(r => r.blob());
    const firstImg = await createImageBitmap(firstBlob);
    const w = firstImg.width;
    const h = firstImg.height;
    const orientation = w > h ? 'landscape' : 'portrait';

    const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] });

    for (let i = 0; i < frames.length; i++) {
        if (i > 0) pdf.addPage([w, h], orientation);

        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d');
        const blob = await fetch(frames[i]).then(r => r.blob());
        const bmp = await createImageBitmap(blob);
        ctx.drawImage(bmp, 0, 0);
        const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
        const jpegUrl = await jpegBlob.arrayBuffer().then(buf => {
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return 'data:image/jpeg;base64,' + btoa(binary);
        });

        pdf.addImage(jpegUrl, 'JPEG', 0, 0, w, h);
    }

    return pdf.output('blob');
}

browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.type === 'capture') {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        frames.push(dataUrl);
    }

    if (msg.action === 'done') {
        if (frames.length === 0) {
            browser.runtime.sendMessage({ action: 'pdfError', error: 'No frames captured.' }).catch(() => {});
            return;
        }

        try {
            const pdfBlob = await framesToPDF();
            let downloadUrl;
            if (typeof URL.createObjectURL === 'function') {
                // Firefox (MV2 background page): blob URLs are supported
                downloadUrl = URL.createObjectURL(pdfBlob);
            } else {
                // Chrome (MV3 service worker): blob URLs unavailable, use data URL
                const arrayBuffer = await pdfBlob.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                downloadUrl = 'data:application/pdf;base64,' + btoa(binary);
            }
            await browser.downloads.download({ url: downloadUrl, filename: 'Perzi2PDF.pdf', saveAs: false });
            if (typeof URL.revokeObjectURL === 'function' && downloadUrl.startsWith('blob:')) {
                URL.revokeObjectURL(downloadUrl);
            }

            frames.length = 0;
            browser.runtime.sendMessage({ action: 'pdfDone' }).catch(() => {});
        } catch (e) {
            console.error('Failed to create PDF:', e);
            browser.runtime.sendMessage({ action: 'pdfError', error: e.message }).catch(() => {});
        }
    }

    if (msg.action === 'clear') {
        frames.length = 0;
    }
});

});