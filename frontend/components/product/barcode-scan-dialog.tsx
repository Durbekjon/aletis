'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, ScanLine, Keyboard, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useBarcodeLookupMutation } from '@/src/hooks/useBarcodeCatalogQuery';
import type { BarcodeCatalogData } from '@/src/api/barcodeCatalogApi';
import type { IScannerControls } from '@zxing/browser';

export interface BarcodeScanResolution {
  barcode: string;
  status: 'PENDING' | 'COMPLETED';
  data?: BarcodeCatalogData;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: (result: BarcodeScanResolution) => void;
}

// Short two-tone beep via Web Audio API — no external asset needed.
function playBeep() {
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 1046.5; // C6 — a clean, audible "scan confirmed" pitch
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
    oscillator.onended = () => ctx.close();
  } catch {
    // best-effort only — silently ignore if AudioContext is unavailable/blocked
  }
}

export function BarcodeScanDialog({ open, onOpenChange, onResolved }: Props) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [resolvedBarcode, setResolvedBarcode] = useState<string | null>(null);
  const [justDetected, setJustDetected] = useState(false);
  const detectedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lookupMutation = useBarcodeLookupMutation();

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  };

  const handleClose = () => {
    stopCamera();
    setManualBarcode('');
    setCameraError(null);
    setResolvedBarcode(null);
    setJustDetected(false);
    lookupMutation.reset();
    onOpenChange(false);
  };

  const runLookup = async (barcode: string) => {
    if (!barcode || lookupMutation.isPending) return;
    stopCamera();
    setResolvedBarcode(barcode);
    try {
      await lookupMutation.mutateAsync(barcode);
    } catch {
      // Lookup failed (network/server error) — let the user re-aim and retry.
      detectedRef.current = false;
      setJustDetected(false);
      startCamera();
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    detectedRef.current = false;
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const { BarcodeFormat, DecodeHintType } = await import('@zxing/library');

      // Retail/GTIN barcodes only — scanning every symbology zxing supports
      // (QR, Aztec, PDF417, ...) is what makes generic scanners feel slow.
      // A real POS scanner only ever looks for these, which is most of why
      // it feels instant.
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
      ]);
      // Real-world phone photos are rarely perfectly flat/aligned (slight
      // tilt, glare, a hand in frame) — without TRY_HARDER, zxing's fast
      // path gives up on anything less than a near-perfect scan.
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints, {
        // Default is 500ms between decode attempts (~2/sec) — far slower
        // than a hardware scanner. Attempt far more often while idle.
        delayBetweenScanAttempts: 50,
        delayBetweenScanSuccess: 500,
      });

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          // A sharper feed means fewer failed decode attempts at normal
          // holding distance, which reads as "faster" even though each
          // individual attempt takes marginally longer.
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const controls = await codeReader.decodeFromConstraints(
        constraints,
        videoRef.current ?? undefined,
        (result) => {
          if (result && !detectedRef.current) {
            detectedRef.current = true;
            setJustDetected(true);
            playBeep();
            runLookup(result.getText());
          }
        },
      );
      controlsRef.current = controls;
    } catch (err: any) {
      setCameraError(
        err?.name === 'NotAllowedError'
          ? "Kameraga ruxsat berilmadi. Barcode'ni qo'lda kiriting."
          : "Kamerani ishga tushirib bo'lmadi. Barcode'ni qo'lda kiriting.",
      );
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }
    // Camera is the default/first tab — Radix only fires onValueChange on
    // user-driven tab switches, not for the initial defaultValue, so kick
    // it off manually as soon as the dialog opens.
    setJustDetected(false);
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleTabChange = (value: string) => {
    if (value === 'camera') {
      setJustDetected(false);
      startCamera();
    } else {
      stopCamera();
    }
  };

  const result = lookupMutation.data;

  const handleUseData = () => {
    if (!resolvedBarcode || !result) return;
    onResolved({ barcode: resolvedBarcode, status: 'COMPLETED', data: result.data });
    handleClose();
  };

  const handleContinueManually = () => {
    if (!resolvedBarcode) return;
    onResolved({ barcode: resolvedBarcode, status: 'PENDING' });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Barcode skanerlash</DialogTitle>
          <DialogDescription>
            Mahsulot ma'lumotlarini avtomatik to'ldirish uchun barcode'ni skanerlang yoki
            qo'lda kiriting.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <Tabs defaultValue="camera" onValueChange={handleTabChange}>
            <TabsList className="w-full">
              <TabsTrigger value="camera" className="flex-1">
                <ScanLine className="h-4 w-4 mr-1" /> Kamera
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">
                <Keyboard className="h-4 w-4 mr-1" /> Qo'lda kiritish
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="space-y-3 pt-2">
              {cameraError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{cameraError}</AlertDescription>
                </Alert>
              ) : (
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

                  {/* Scan-guide frame: aims the user at the barcode, corners only so the
                      video stays visible; turns green the instant a code is detected. */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      className={`relative h-1/3 w-4/5 max-w-xs transition-colors duration-150 ${
                        justDetected ? 'border-green-400' : 'border-white/70'
                      }`}
                    >
                      <span
                        className={`absolute -top-0.5 -left-0.5 h-6 w-6 border-t-4 border-l-4 rounded-tl-md ${justDetected ? 'border-green-400' : 'border-white'}`}
                      />
                      <span
                        className={`absolute -top-0.5 -right-0.5 h-6 w-6 border-t-4 border-r-4 rounded-tr-md ${justDetected ? 'border-green-400' : 'border-white'}`}
                      />
                      <span
                        className={`absolute -bottom-0.5 -left-0.5 h-6 w-6 border-b-4 border-l-4 rounded-bl-md ${justDetected ? 'border-green-400' : 'border-white'}`}
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-6 w-6 border-b-4 border-r-4 rounded-br-md ${justDetected ? 'border-green-400' : 'border-white'}`}
                      />
                      {!justDetected && (
                        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80 animate-pulse" />
                      )}
                    </div>
                  </div>

                  {!justDetected && !lookupMutation.isPending && (
                    <p className="absolute bottom-2 inset-x-0 text-center text-xs text-white/90 drop-shadow">
                      Barcode'ni ramka ichiga joylashtiring
                    </p>
                  )}

                  {lookupMutation.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="flex flex-col items-center gap-2 text-white">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-xs">Qidirilmoqda...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-3 pt-2">
              <Input
                autoFocus
                placeholder="Barcode raqamini kiriting"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runLookup(manualBarcode.trim());
                }}
              />
              <Button
                className="w-full"
                onClick={() => runLookup(manualBarcode.trim())}
                disabled={!manualBarcode.trim() || lookupMutation.isPending}
              >
                {lookupMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Qidirish
              </Button>
            </TabsContent>
          </Tabs>
        ) : result.status === 'COMPLETED' && result.data ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">{result.data.productName}</p>
                {result.data.description && (
                  <p className="text-muted-foreground">{result.data.description}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {result.data.brandName && <Badge variant="secondary">{result.data.brandName}</Badge>}
              {result.data.categoryName && (
                <Badge variant="secondary">{result.data.categoryName}</Badge>
              )}
              {result.data.unitName && <Badge variant="secondary">{result.data.unitName}</Badge>}
              {result.source && (
                <Badge variant="outline">
                  {result.source === 'SOLIQ' ? 'Soliq katalogi' : "Qo'lda kiritilgan"}
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bu barcode katalogda topilmadi. Mahsulot ma'lumotlarini qo'lda kiriting — kiritgan
              ma'lumotlaringiz keyingi safar uchun katalogga saqlanadi.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Bekor qilish
          </Button>
          {result && result.status === 'COMPLETED' && (
            <Button onClick={handleUseData}>Ma'lumotlarni ishlatish</Button>
          )}
          {result && result.status === 'PENDING' && (
            <Button onClick={handleContinueManually}>Davom etish</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
