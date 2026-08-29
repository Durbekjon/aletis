import { useEffect, useCallback, useRef } from 'react';

/**
 * Global Barcode Scanner Hook
 * Listens for rapid keystrokes that end with an Enter key, which is the typical behavior of physical barcode scanners.
 */
export function useBarcodeScanner({
  onScan,
  timeout = 50, // milliseconds between keystrokes to be considered a scanner
}: {
  onScan: (barcode: string) => void;
  timeout?: number;
}) {
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef<number>(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field, text area, etc.
      // But we DO want to capture if they are in the POS search input!
      // Actually, if we capture globally, we might double-fire if they are in an input.
      // We will allow input elements if they are type="text", but we need to prevent default or handle it gracefully.
      
      const currentTime = Date.now();
      
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 2) {
          // If we have a buffer and Enter is pressed, it's likely a scan completion
          onScan(barcodeBuffer.current);
          barcodeBuffer.current = '';
          e.preventDefault();
        }
        return;
      }

      // If it's a single character
      if (e.key.length === 1) {
        // If the time between keystrokes is too long, clear the buffer (it's human typing)
        if (currentTime - lastKeyTime.current > timeout) {
          barcodeBuffer.current = '';
        }
        
        barcodeBuffer.current += e.key;
        lastKeyTime.current = currentTime;
      }
    },
    [onScan, timeout]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
