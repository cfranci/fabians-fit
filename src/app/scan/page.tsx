"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { FoodItem, MealType, NutritionInfo } from "@/lib/types";
import { BrowserMultiFormatReader } from "@zxing/browser";
import Tesseract from "tesseract.js";
import FrequentFoods from "@/components/FrequentFoods";
import Link from "next/link";

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>}>
      <ScanPageInner />
    </Suspense>
  );
}

type ScanTab = "barcode" | "label";
type BottomSheet = "none" | "search" | "results" | "manual" | "label-review";

function ScanPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mealParam = searchParams.get("meal") as MealType | null;

  const [scanTab, setScanTab] = useState<ScanTab>("barcode");
  const [sheet, setSheet] = useState<BottomSheet>("none");
  const [meal, setMeal] = useState<MealType>(mealParam || "breakfast");

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Barcode
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);

  // Label OCR
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [labelValues, setLabelValues] = useState({
    calories: 0, protein: 0, carbs: 0, fat: 0,
    fiber: 0, sugar: 0, sodium: 0, servingSize: "",
  });
  const [rawOcrText, setRawOcrText] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);

  // Manual
  const [manualForm, setManualForm] = useState({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const { addEntry, getFrequentFoods } = useStore();
  const frequentFoods = getFrequentFoods(10);

  // --- Camera lifecycle ---
  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      setCameraError("Camera access denied. Check permissions.");
    }
  }, [stopCamera]);

  // Start barcode scanning loop
  const startBarcodeScanning = useCallback(() => {
    if (!videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result) {
          const text = result.getText();
          if (text) {
            setLastBarcode(text);
            lookupBarcode(text);
          }
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
        setCameraReady(true);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setCameraError("Camera access denied. Check permissions.");
        } else if (err instanceof DOMException && err.name === "NotFoundError") {
          setCameraError("No camera found.");
        } else {
          setCameraError("Could not access camera.");
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch between barcode / label tabs
  useEffect(() => {
    if (scanTab === "barcode") {
      setCapturedImage(null);
      startBarcodeScanning();
    } else {
      // Label mode: plain camera, no barcode decoder
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      startCamera();
    }
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanTab]);

  // --- Actions ---
  async function lookupBarcode(barcode: string) {
    setSearching(true);
    setSheet("results");
    try {
      const res = await fetch(`/api/food-search?barcode=${barcode}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }

  function captureLabel() {
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
  }

  async function runOCR(imageData: string) {
    setOcrProcessing(true);
    setOcrProgress(0);
    try {
      const worker = await Tesseract.createWorker("eng", undefined, {
        logger: (msg) => {
          if (msg.status === "recognizing text") setOcrProgress(Math.round(msg.progress * 100));
        },
      });
      const result = await worker.recognize(imageData);
      setRawOcrText(result.data.text);
      await worker.terminate();

      const response = await fetch("/api/analyze-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result.data.text }),
      });
      const data = await response.json();
      setLabelValues({
        calories: data.nutrition.calories ?? 0,
        protein: data.nutrition.protein ?? 0,
        carbs: data.nutrition.carbs ?? 0,
        fat: data.nutrition.fat ?? 0,
        fiber: data.nutrition.fiber ?? 0,
        sugar: data.nutrition.sugar ?? 0,
        sodium: data.nutrition.sodium ?? 0,
        servingSize: data.nutrition.servingSize ?? "",
      });
      setSheet("label-review");
    } catch {
      setCameraError("Failed to read label. Try again.");
      retakeLabel();
    }
    setOcrProcessing(false);
  }

  function retakeLabel() {
    setCapturedImage(null);
    setOcrProcessing(false);
    setSheet("none");
    startCamera();
  }

  function confirmLabel() {
    const food: FoodItem = {
      id: `label-${Date.now()}`,
      name: "Scanned Label",
      nutrition: { ...labelValues },
      source: "label",
      createdAt: new Date().toISOString(),
    };
    addFood(food);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }

  function addFood(food: FoodItem) {
    addEntry(food, meal, servings);
    setServings(1);
    setSelectedFood(null);
    setSheet("none");
    setToast(`Added to ${meal}`);
    setTimeout(() => setToast(null), 1400);
  }

  function addManual() {
    const food: FoodItem = {
      id: `manual-${Date.now()}`,
      name: manualForm.name || "Custom Food",
      nutrition: { calories: manualForm.calories, protein: manualForm.protein, carbs: manualForm.carbs, fat: manualForm.fat },
      source: "manual",
      createdAt: new Date().toISOString(),
    };
    addFood(food);
    setManualForm({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  const sheetOpen = sheet !== "none";

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* ---- CAMERA VIEW (top half, always visible) ---- */}
      <div className="relative flex-1 min-h-0">
        {/* Live video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${capturedImage ? "hidden" : ""}`}
        />

        {/* Captured label preview */}
        {capturedImage && (
          <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* OCR progress overlay */}
        {ocrProcessing && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
            </div>
            <p className="text-white/70 text-sm">Reading label... {ocrProgress}%</p>
          </div>
        )}

        {/* Camera loading */}
        {!cameraReady && !capturedImage && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <p className="text-red-400 text-sm px-8 text-center">{cameraError}</p>
          </div>
        )}

        {/* Viewfinder */}
        {!capturedImage && !ocrProcessing && cameraReady && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {scanTab === "barcode" ? (
              // Barcode frame
              <div className="relative w-64 h-40">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/60 rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/60 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/60 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/60 rounded-br" />
                <div className="absolute left-3 right-3 h-0.5 bg-accent/70 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-scanline" />
              </div>
            ) : (
              // Label frame
              <div className="w-[80%] max-w-xs aspect-[3/4] border-2 border-white/40 rounded-2xl" />
            )}
          </div>
        )}

        {/* Top bar: back + meal pills */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-4 pt-4 pb-2 bg-gradient-to-b from-black/70 to-transparent">
          <Link href="/" className="text-white/80 hover:text-white mr-1 text-lg">&larr;</Link>
          {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition ${
                meal === m ? "bg-accent text-black" : "bg-white/15 text-white/70"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Scan mode toggle (barcode / label) */}
        {!capturedImage && (
          <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-1">
            <div className="bg-black/60 backdrop-blur-sm rounded-full p-1 flex">
              <button
                onClick={() => setScanTab("barcode")}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                  scanTab === "barcode" ? "bg-white text-black" : "text-white/70"
                }`}
              >
                Barcode
              </button>
              <button
                onClick={() => setScanTab("label")}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                  scanTab === "label" ? "bg-white text-black" : "text-white/70"
                }`}
              >
                Label
              </button>
            </div>
          </div>
        )}

        {/* Capture button (label mode only) */}
        {scanTab === "label" && !capturedImage && cameraReady && (
          <button
            onClick={captureLabel}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 w-16 h-16 rounded-full bg-white border-4 border-white/50 active:scale-90 transition-transform shadow-lg"
          />
        )}
      </div>

      {/* ---- BOTTOM AREA ---- */}
      <div
        className={`bg-background rounded-t-3xl transition-all duration-300 ease-out flex flex-col overflow-hidden ${
          sheetOpen ? "max-h-[65vh]" : "max-h-48"
        }`}
      >
        {/* Pull bar */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 bg-card-border rounded-full" />
        </div>

        {/* Default: search + quick actions */}
        {sheet === "none" && (
          <div className="px-4 pb-4 space-y-3">
            {/* Search */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search foods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSheet("search")}
                onKeyDown={(e) => { if (e.key === "Enter") { setSheet("search"); handleSearch(); } }}
                className="flex-1 bg-card border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
              />
            </div>
            {/* Quick row */}
            <div className="flex gap-2">
              <button onClick={() => setSheet("manual")} className="flex-1 bg-card border border-card-border rounded-xl px-3 py-2.5 text-xs text-muted hover:border-accent transition text-center">
                Manual Entry
              </button>
              {lastBarcode && (
                <button onClick={() => lookupBarcode(lastBarcode)} className="flex-1 bg-card border border-card-border rounded-xl px-3 py-2.5 text-xs text-muted hover:border-accent transition text-center truncate">
                  Re-scan: {lastBarcode}
                </button>
              )}
            </div>
            {/* Frequent foods */}
            {frequentFoods.length > 0 && (
              <FrequentFoods foods={frequentFoods} onAdd={(item) => addFood(item)} currentMeal={meal} />
            )}
          </div>
        )}

        {/* Search sheet */}
        {sheet === "search" && (
          <div className="px-4 pb-4 flex-1 overflow-y-auto">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Search foods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                autoFocus
                className="flex-1 bg-card border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <button onClick={handleSearch} className="bg-accent text-black font-semibold px-4 rounded-xl text-sm">Go</button>
              <button onClick={() => { setSheet("none"); setSearchResults([]); }} className="text-muted text-sm px-2">x</button>
            </div>
            {searching ? (
              <div className="flex justify-center py-6"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>
            ) : (
              <FoodResultsList results={searchResults} selectedFood={selectedFood} servings={servings} onSelect={setSelectedFood} onServingsChange={setServings} onAdd={addFood} />
            )}
          </div>
        )}

        {/* Barcode results sheet */}
        {sheet === "results" && (
          <div className="px-4 pb-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">
                {lastBarcode && <span className="text-muted text-xs">Barcode: {lastBarcode}</span>}
              </p>
              <button onClick={() => { setSheet("none"); setSearchResults([]); }} className="text-muted text-xs hover:text-foreground">Close</button>
            </div>
            {searching ? (
              <div className="flex justify-center py-6"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted text-sm">Not found</p>
                <button onClick={() => setScanTab("label")} className="text-accent text-xs mt-2">Try scanning the label</button>
              </div>
            ) : (
              <FoodResultsList results={searchResults} selectedFood={selectedFood} servings={servings} onSelect={setSelectedFood} onServingsChange={setServings} onAdd={addFood} />
            )}
          </div>
        )}

        {/* Label review sheet */}
        {sheet === "label-review" && (
          <div className="px-4 pb-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Nutrition Facts</p>
              <button onClick={retakeLabel} className="text-muted text-xs hover:text-foreground">Retake</button>
            </div>
            {rawOcrText && (
              <details className="mb-3">
                <summary className="text-muted text-xs cursor-pointer">Raw OCR text</summary>
                <pre className="mt-1 p-2 bg-card rounded-lg text-muted text-xs whitespace-pre-wrap max-h-24 overflow-y-auto">{rawOcrText}</pre>
              </details>
            )}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {([
                ["servingSize", "Serving", ""],
                ["calories", "Calories", "kcal"],
                ["protein", "Protein", "g"],
                ["carbs", "Carbs", "g"],
                ["fat", "Fat", "g"],
                ["fiber", "Fiber", "g"],
                ["sugar", "Sugar", "g"],
                ["sodium", "Sodium", "mg"],
              ] as const).map(([key, label, unit]) => (
                <div key={key} className="flex items-center bg-card rounded-lg px-3 py-2 gap-2">
                  <span className="text-xs text-muted flex-1">{label}</span>
                  <input
                    type={key === "servingSize" ? "text" : "number"}
                    inputMode={key === "servingSize" ? "text" : "decimal"}
                    value={labelValues[key]}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLabelValues((prev) => ({
                        ...prev,
                        [key]: key === "servingSize" ? v : (parseFloat(v) || 0),
                      }));
                    }}
                    className="w-16 bg-background border border-card-border rounded px-2 py-1 text-xs text-right text-foreground focus:outline-none focus:border-accent"
                  />
                  {unit && <span className="text-muted text-[10px] w-5">{unit}</span>}
                </div>
              ))}
            </div>
            <button onClick={confirmLabel} className="w-full bg-accent text-black font-semibold py-2.5 rounded-xl text-sm">
              Add to {meal}
            </button>
          </div>
        )}

        {/* Manual entry sheet */}
        {sheet === "manual" && (
          <div className="px-4 pb-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Manual Entry</p>
              <button onClick={() => setSheet("none")} className="text-muted text-xs hover:text-foreground">Close</button>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Food name"
                value={manualForm.name}
                onChange={(e) => setManualForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-card border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <div className="grid grid-cols-2 gap-2">
                {([["calories", "Calories", "kcal"], ["protein", "Protein", "g"], ["carbs", "Carbs", "g"], ["fat", "Fat", "g"]] as const).map(([key, label, unit]) => (
                  <div key={key}>
                    <label className="text-[10px] text-muted mb-0.5 block">{label} ({unit})</label>
                    <input type="number" min="0" value={manualForm[key] || ""} onChange={(e) => setManualForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))} className="w-full bg-card border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent" />
                  </div>
                ))}
              </div>
              <button onClick={addManual} className="w-full bg-accent text-black font-semibold py-2.5 rounded-xl text-sm mt-1">
                Add to {meal}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-accent text-black px-5 py-2 rounded-full text-sm font-semibold shadow-lg animate-bounce">
          {toast}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// --- Food results list ---
function FoodResultsList({
  results, selectedFood, servings, onSelect, onServingsChange, onAdd,
}: {
  results: FoodItem[];
  selectedFood: FoodItem | null;
  servings: number;
  onSelect: (f: FoodItem) => void;
  onServingsChange: (n: number) => void;
  onAdd: (f: FoodItem) => void;
}) {
  if (results.length === 0) return <p className="text-muted text-sm text-center py-4">No results</p>;

  return (
    <div className="space-y-1.5">
      {results.map((food) => (
        <button
          key={food.id}
          onClick={() => onSelect(food)}
          className={`w-full bg-card border rounded-xl p-3 text-left transition ${
            selectedFood?.id === food.id ? "border-accent" : "border-card-border"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{food.name}</p>
              {food.brand && <p className="text-muted text-xs truncate">{food.brand}</p>}
            </div>
            <span className="text-accent font-bold text-sm ml-2 shrink-0">{food.nutrition.calories} cal</span>
          </div>
          <div className="flex gap-3 mt-1.5 text-[11px] text-muted">
            <span>P {food.nutrition.protein}g</span>
            <span>C {food.nutrition.carbs}g</span>
            <span>F {food.nutrition.fat}g</span>
            {food.nutrition.servingSize && <span className="ml-auto">{food.nutrition.servingSize}</span>}
          </div>
          {selectedFood?.id === food.id && (
            <div className="mt-2 pt-2 border-t border-card-border flex items-center gap-2">
              <span className="text-[11px] text-muted">Servings</span>
              <input
                type="number" min="0.25" step="0.25" value={servings}
                onChange={(e) => { e.stopPropagation(); onServingsChange(parseFloat(e.target.value) || 1); }}
                onClick={(e) => e.stopPropagation()}
                className="w-14 bg-background border border-card-border rounded px-2 py-1 text-xs text-center"
              />
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(food); }}
                className="ml-auto bg-accent text-black font-semibold px-4 py-1.5 rounded-full text-xs"
              >
                Add
              </button>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
