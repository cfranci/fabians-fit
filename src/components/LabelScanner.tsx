"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Tesseract from "tesseract.js";

interface LabelScannerProps {
  onResult: (nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    servingSize?: string;
  }) => void;
  onClose: () => void;
}

type ScanStep = "camera" | "processing" | "results";

interface NutritionValues {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  servingSize: string;
}

const defaultValues: NutritionValues = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
  servingSize: "",
};

export default function LabelScanner({ onResult, onClose }: LabelScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<ScanStep>("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [rawText, setRawText] = useState("");
  const [values, setValues] = useState<NutritionValues>(defaultValues);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start camera on mount
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true);
          };
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            "Could not access camera. Please allow camera permissions and try again."
          );
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stopCamera]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImage(dataUrl);
    stopCamera();
    runOCR(dataUrl);
  }, [stopCamera]);

  async function runOCR(imageData: string) {
    setStep("processing");
    setOcrProgress(0);
    setError(null);

    try {
      const worker = await Tesseract.createWorker("eng", undefined, {
        logger: (msg) => {
          if (msg.status === "recognizing text") {
            setOcrProgress(Math.round(msg.progress * 100));
          }
        },
      });

      const result = await worker.recognize(imageData);
      const text = result.data.text;
      setRawText(text);

      await worker.terminate();

      // Send to API for parsing
      const response = await fetch("/api/analyze-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze label");
      }

      const data = await response.json();
      setValues({
        calories: data.nutrition.calories ?? 0,
        protein: data.nutrition.protein ?? 0,
        carbs: data.nutrition.carbs ?? 0,
        fat: data.nutrition.fat ?? 0,
        fiber: data.nutrition.fiber ?? 0,
        sugar: data.nutrition.sugar ?? 0,
        sodium: data.nutrition.sodium ?? 0,
        servingSize: data.nutrition.servingSize ?? "",
      });
      setStep("results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong during scanning"
      );
      setStep("results");
    }
  }

  function handleFieldChange(field: keyof NutritionValues, raw: string) {
    if (field === "servingSize") {
      setValues((prev) => ({ ...prev, servingSize: raw }));
    } else {
      const num = parseFloat(raw);
      setValues((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
    }
  }

  function handleConfirm() {
    onResult({
      calories: values.calories,
      protein: values.protein,
      carbs: values.carbs,
      fat: values.fat,
      fiber: values.fiber || undefined,
      sugar: values.sugar || undefined,
      sodium: values.sodium || undefined,
      servingSize: values.servingSize || undefined,
    });
  }

  function handleRetake() {
    setCapturedImage(null);
    setRawText("");
    setValues(defaultValues);
    setError(null);
    setStep("camera");
    setCameraReady(false);

    // Restart camera
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true);
          };
        }
      })
      .catch(() => {
        setError("Could not restart camera.");
      });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900">
        <h2 className="text-white text-lg font-semibold">Scan Nutrition Label</h2>
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="text-zinc-400 hover:text-white transition-colors p-1"
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
      </div>

      {/* Camera View */}
      {step === "camera" && (
        <div className="flex flex-col flex-1 items-center justify-center relative">
          {error ? (
            <div className="px-6 text-center">
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-zinc-700 text-white rounded-lg"
              >
                Go Back
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover absolute inset-0"
              />
              {/* Viewfinder overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[85%] max-w-sm aspect-[3/4] border-2 border-white/50 rounded-2xl" />
              </div>
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <p className="text-zinc-400 text-sm">Starting camera...</p>
                </div>
              )}
              {/* Capture button */}
              <div className="absolute bottom-0 left-0 right-0 pb-10 flex justify-center">
                <button
                  onClick={capture}
                  disabled={!cameraReady}
                  className="w-18 h-18 rounded-full bg-white border-4 border-zinc-300 shadow-lg active:scale-95 transition-transform disabled:opacity-40"
                  aria-label="Capture photo"
                >
                  <div className="w-full h-full rounded-full bg-white hover:bg-zinc-100 transition-colors" />
                </button>
              </div>
              <p className="absolute bottom-2 left-0 right-0 text-center text-zinc-400 text-xs">
                Position the nutrition label inside the frame
              </p>
            </>
          )}
        </div>
      )}

      {/* Processing View */}
      {step === "processing" && (
        <div className="flex flex-col flex-1 items-center justify-center px-6 gap-6">
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured label"
              className="w-full max-w-xs rounded-xl shadow-lg opacity-60"
            />
          )}
          <div className="w-full max-w-xs">
            <p className="text-white text-sm text-center mb-3">
              Reading nutrition label...
            </p>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
            <p className="text-zinc-500 text-xs text-center mt-2">{ocrProgress}%</p>
          </div>
        </div>
      )}

      {/* Results View */}
      {step === "results" && (
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Captured image thumbnail */}
          {capturedImage && (
            <div className="px-4 pt-4">
              <img
                src={capturedImage}
                alt="Captured label"
                className="w-full max-h-40 object-contain rounded-xl bg-zinc-900"
              />
            </div>
          )}

          {error && (
            <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Raw OCR text (collapsed) */}
          {rawText && (
            <details className="mx-4 mt-4">
              <summary className="text-zinc-500 text-xs cursor-pointer hover:text-zinc-300 transition-colors">
                View raw OCR text
              </summary>
              <pre className="mt-2 p-3 bg-zinc-900 rounded-lg text-zinc-400 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                {rawText}
              </pre>
            </details>
          )}

          {/* Editable nutrition fields */}
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-white font-semibold mb-3">Nutrition Facts</h3>
            <p className="text-zinc-500 text-xs mb-4">
              Review and correct any values before saving.
            </p>
          </div>

          <div className="px-4 space-y-3 pb-4">
            <NutritionField
              label="Serving Size"
              value={values.servingSize}
              onChange={(v) => handleFieldChange("servingSize", v)}
              type="text"
            />
            <NutritionField
              label="Calories"
              value={values.calories}
              onChange={(v) => handleFieldChange("calories", v)}
              unit="kcal"
            />
            <NutritionField
              label="Protein"
              value={values.protein}
              onChange={(v) => handleFieldChange("protein", v)}
              unit="g"
            />
            <NutritionField
              label="Carbs"
              value={values.carbs}
              onChange={(v) => handleFieldChange("carbs", v)}
              unit="g"
            />
            <NutritionField
              label="Fat"
              value={values.fat}
              onChange={(v) => handleFieldChange("fat", v)}
              unit="g"
            />
            <NutritionField
              label="Fiber"
              value={values.fiber}
              onChange={(v) => handleFieldChange("fiber", v)}
              unit="g"
            />
            <NutritionField
              label="Sugar"
              value={values.sugar}
              onChange={(v) => handleFieldChange("sugar", v)}
              unit="g"
            />
            <NutritionField
              label="Sodium"
              value={values.sodium}
              onChange={(v) => handleFieldChange("sodium", v)}
              unit="mg"
            />
          </div>

          {/* Action buttons */}
          <div className="sticky bottom-0 px-4 py-4 bg-gradient-to-t from-black via-black to-transparent">
            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium text-sm hover:bg-zinc-700 transition-colors"
              >
                Retake
              </button>
              <button
                onClick={handleConfirm}
                className="flex-[2] py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-500 transition-colors"
              >
                Save Nutrition Info
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function NutritionField({
  label,
  value,
  onChange,
  unit,
  type = "number",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  unit?: string;
  type?: "text" | "number";
}) {
  return (
    <div className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3">
      <label className="text-zinc-300 text-sm flex-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type={type}
          inputMode={type === "number" ? "decimal" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 bg-zinc-800 text-white text-sm text-right rounded-lg px-2.5 py-1.5 border border-zinc-700 focus:border-green-500 focus:outline-none transition-colors"
        />
        {unit && <span className="text-zinc-500 text-xs w-6">{unit}</span>}
      </div>
    </div>
  );
}
