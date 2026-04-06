"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    let cancelled = false;

    const startScanning = async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result, _err) => {
            if (result && !cancelled) {
              const text = result.getText();
              if (text) {
                setScanning(false);
                onScan(text);
              }
            }
          }
        );
        if (!cancelled) {
          controlsRef.current = controls;
        } else {
          controls.stop();
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof DOMException && err.name === "NotAllowedError") {
            setError("Camera access denied. Please allow camera permissions and try again.");
          } else if (err instanceof DOMException && err.name === "NotFoundError") {
            setError("No camera found on this device.");
          } else {
            setError("Could not access camera. Please check your permissions.");
          }
        }
      }
    };

    startScanning();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [onScan, stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="Close scanner"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="relative flex w-full max-w-sm flex-col items-center gap-4 px-4">
        {/* Scanner title */}
        <p className="text-sm font-medium text-white/80">Scan a barcode</p>

        {/* Video container */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            className="h-72 w-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {/* Scanning overlay with animated line */}
          {scanning && !error && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {/* Corner brackets */}
              <div className="relative h-48 w-64">
                {/* Top-left */}
                <div className="absolute top-0 left-0 h-6 w-6 border-t-2 border-l-2 border-white/70 rounded-tl" />
                {/* Top-right */}
                <div className="absolute top-0 right-0 h-6 w-6 border-t-2 border-r-2 border-white/70 rounded-tr" />
                {/* Bottom-left */}
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-white/70 rounded-bl" />
                {/* Bottom-right */}
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-white/70 rounded-br" />

                {/* Animated scan line */}
                <div className="absolute left-2 right-2 h-0.5 bg-accent/80 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-scanline" />
              </div>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="w-full rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Hint text */}
        {!error && (
          <p className="text-xs text-white/50">
            Point your camera at a barcode on the food package
          </p>
        )}

        {/* Cancel button */}
        <button
          onClick={handleClose}
          className="mt-2 rounded-full bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          Cancel
        </button>
      </div>

    </div>
  );
}
