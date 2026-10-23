
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QuoteImageModalProps {
  text: string;
  author: string;
  bookTitle: string;
  bookId: string;
  url: string;
  title: string;
  onClose: () => void;
}

export const QuoteImageModal: React.FC<QuoteImageModalProps> = ({ text, author, title, bookTitle, bookId, url, onClose }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setImageUrl(null);
    setError(null);
    const generateImage = async () => {
        await document.fonts?.ready;
        // Use in-memory canvas instead of DOM ref to avoid render-dependency issues
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('This browser cannot generate quote images.');

        // Config
        const width = 1080; 
        const padding = 80;
        const lineHeight = 64;
        
        // Setup Font - Sans-serif as requested
        const fontMain = 'bold 48px "Inter", sans-serif';
        const fontQuote = 'bold 200px "Inter", sans-serif';
        const fontMeta = 'bold 28px "Inter", sans-serif';
        const fontTitle = 'italic 28px "Inter", sans-serif';
        const fontFooter = 'normal 24px "Inter", sans-serif';

        // Wrap text logic
        ctx.font = fontMain;
        const words = text.trim().split(/\s+/);
        const lines: string[] = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + " " + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width < width - (padding * 2)) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = words[i];
            }
        }
        lines.push(currentLine);

        // Calculate Layout
        const textHeight = lines.length * lineHeight;
        const headerHeight = 100;
        const footerHeight = 250; // Increased for QR code
        // Calculate height to fit text, but minimum square-ish 1080
        let height = Math.max(1080, textHeight + headerHeight + footerHeight + padding); 

        canvas.width = width;
        canvas.height = height;

        // 1. Draw Background (Lighter Blue Gradient)
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#60a5fa'); // Blue 400
        gradient.addColorStop(1, '#2563eb'); // Blue 600
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Decorative Quote Mark
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Slightly more visible on lighter bg
        ctx.font = fontQuote;
        ctx.fillText('“', padding - 40, 300);

        // 3. Draw Main Text
        ctx.fillStyle = '#ffffff';
        ctx.font = fontMain;
        ctx.textBaseline = 'top';
        
        // Center text vertically in the available space minus footer
        let startY = (height - footerHeight - textHeight) / 2;
        if (startY < headerHeight) startY = headerHeight;

        lines.forEach((line, i) => {
            ctx.fillText(line, padding, startY + (i * lineHeight));
        });

        // 4. Draw Footer
        const footerY = height - footerHeight;
        
        // Divider line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, footerY);
        ctx.lineTo(width - padding, footerY);
        ctx.stroke();

        const metaStartY = footerY + 40;

        // Author
        ctx.fillStyle = '#ffffff';
        ctx.font = fontMeta;
        ctx.fillText(author, padding, metaStartY, width - padding * 2 - 180);

        // Section/Title
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = fontTitle;
        ctx.fillText(title, padding, metaStartY + 40, width - padding * 2 - 180);

        // Ebook Title & Link
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = fontFooter;
        ctx.fillText(bookTitle, padding, metaStartY + 90, width - padding * 2 - 180);
        ctx.fillText(new URL(url).host + new URL(url).pathname, padding, metaStartY + 125, width - padding * 2 - 180);

        // QR Code
        try {
            const qrSize = 150;
            const qrDataUrl = await QRCode.toDataURL(url, { 
                width: qrSize,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            
            const qrImg = new Image();
            await new Promise((resolve, reject) => { 
                qrImg.onload = resolve; 
                qrImg.onerror = reject;
                qrImg.src = qrDataUrl;
            });
            
            // Draw QR Code box (white bg)
            const qrX = width - padding - qrSize;
            const qrY = metaStartY - 10;
            
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
            
        } catch (e) {
            console.error("QR Code error:", e);
        }

        // Generate Image
        try {
            const dataUrl = canvas.toDataURL('image/png');
            if (!cancelled) setImageUrl(dataUrl);
        } catch (e) {
            if (!cancelled) setError('The browser could not create this quote image.');
        }
    };

    void generateImage().catch(() => { if (!cancelled) setError('The browser could not create this quote image.'); });
    return () => { cancelled = true; };
  }, [text, author, title, bookTitle, url]);

  const handleCopyImage = async () => {
    if (!imageUrl) return;
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob,
            }),
        ]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
        console.error('Failed to copy image:', err);
        alert('Failed to copy image to clipboard. You may need to use the download button instead.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Share quote" className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">image</span>
                Share Quote
            </h3>
            <button aria-label="Close quote sharing" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
            </button>
        </div>
        
        <div className="p-6 bg-gray-100 dark:bg-gray-950 flex-1 overflow-auto flex justify-center items-center min-h-[300px]">
            {imageUrl ? (
                <img src={imageUrl} alt="Quote Preview" className="max-w-full shadow-lg rounded-lg object-contain" style={{ maxHeight: '60vh' }} />
            ) : (
                <div className="flex flex-col items-center gap-3 text-gray-400">
                    <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
                    <span className="text-sm font-medium" role="status">{error ?? 'Generating image...'}</span>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-white dark:bg-gray-900 flex-wrap">
             <button 
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
            >
                Cancel
            </button>
            {imageUrl && (
                <>
                    <button
                        onClick={handleCopyImage}
                        className={`px-5 py-2 border rounded-lg font-medium transition-colors flex items-center gap-2
                            ${copySuccess 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' 
                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }
                        `}
                    >
                        <span className="material-symbols-outlined text-lg">
                            {copySuccess ? 'check' : 'content_copy'}
                        </span>
                        {copySuccess ? 'Copied!' : 'Copy Image'}
                    </button>
                    <a 
                        href={imageUrl} 
                        download={`${bookId.replace(/[^a-z0-9-]/gi, '-')}-quote.png`}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg transform active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        Download
                    </a>
                </>
            )}
        </div>
      </div>
    </div>
  );
};
