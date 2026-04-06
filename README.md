# FuelTrack

A fitness tracking app that replaces MyFitnessPal. Scan barcodes, photograph nutrition labels, search the USDA database, or manually enter foods. Tracks calories, macros, and learns your eating habits over time.

## Features

- **Barcode Scanning** -- Point your camera at any food barcode for instant lookup via OpenFoodFacts and USDA FoodData Central
- **Nutrition Label OCR** -- Photograph the nutrition facts panel when barcodes fail. Tesseract.js reads the label and extracts all macros
- **USDA Food Search** -- Search 300k+ foods from the USDA FoodData Central database
- **Manual Entry** -- Type in nutrition info directly for custom foods
- **Daily Dashboard** -- Calorie ring, macro progress (protein/carbs/fat), and meal-by-meal breakdown
- **Smart Recommendations** -- Tracks your frequently eaten foods and surfaces them as one-tap quick-adds
- **Seamless Camera UI** -- Camera stays live while you switch between barcode and label modes, search, or review results via bottom sheet
- **History View** -- 7-day food log with daily macro breakdowns
- **Offline Storage** -- All data persists locally via Zustand + localStorage

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Zustand (state management)
- @zxing/browser (barcode scanning)
- Tesseract.js (OCR)
- USDA FoodData Central API
- OpenFoodFacts API

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Optional: USDA API Key

The app works with the USDA demo key by default. For production use, get a free key at https://fdc.nal.usda.gov/api-key-signup and add it to `.env.local`:

```
USDA_API_KEY=your_key_here
```

## Project Structure

```
src/
  app/
    page.tsx          # Daily dashboard
    scan/page.tsx     # Camera scanner + food search
    log/page.tsx      # History view
    api/
      food-search/    # USDA + OpenFoodFacts lookup
      analyze-label/  # Nutrition label text parser
  components/
    BarcodeScanner    # ZXing camera barcode reader
    LabelScanner      # Tesseract OCR label reader
    MacroRing         # SVG circular progress
    MealSection       # Meal grouping with food cards
    FoodLogCard       # Individual food entry card
    FrequentFoods     # Quick-add frequent foods row
  lib/
    store.ts          # Zustand store with persistence
    types.ts          # TypeScript interfaces
```
