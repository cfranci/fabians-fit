import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text } = body;

  if (!text) {
    return Response.json({ error: "No text provided" }, { status: 400 });
  }

  // Parse nutrition facts from OCR text
  const nutrition = parseNutritionLabel(text);

  return Response.json({
    nutrition,
    raw: text,
  });
}

function parseNutritionLabel(text: string) {
  const lines = text.split("\n").map((l) => l.trim().toLowerCase());
  const fullText = lines.join(" ");

  const extractNumber = (patterns: RegExp[]): number => {
    for (const pattern of patterns) {
      const match = fullText.match(pattern);
      if (match) {
        const num = parseFloat(match[1]);
        if (!isNaN(num)) return num;
      }
    }
    return 0;
  };

  const calories = extractNumber([
    /calories\s*(\d+)/,
    /cal(?:ories)?\s*(\d+)/,
    /(\d+)\s*cal(?:ories)?/,
    /energy\s*(\d+)\s*kcal/,
  ]);

  const protein = extractNumber([
    /protein\s*(\d+\.?\d*)\s*g/,
    /protein\s*(\d+\.?\d*)/,
  ]);

  const carbs = extractNumber([
    /total\s*carb(?:ohydrate)?s?\s*(\d+\.?\d*)\s*g/,
    /carb(?:ohydrate)?s?\s*(\d+\.?\d*)\s*g/,
    /carb(?:ohydrate)?s?\s*(\d+\.?\d*)/,
  ]);

  const fat = extractNumber([
    /total\s*fat\s*(\d+\.?\d*)\s*g/,
    /fat\s*(\d+\.?\d*)\s*g/,
    /fat\s*(\d+\.?\d*)/,
  ]);

  const fiber = extractNumber([
    /dietary\s*fiber\s*(\d+\.?\d*)\s*g/,
    /fiber\s*(\d+\.?\d*)\s*g/,
    /fiber\s*(\d+\.?\d*)/,
  ]);

  const sugar = extractNumber([
    /total\s*sugars?\s*(\d+\.?\d*)\s*g/,
    /sugars?\s*(\d+\.?\d*)\s*g/,
    /sugars?\s*(\d+\.?\d*)/,
  ]);

  const sodium = extractNumber([
    /sodium\s*(\d+\.?\d*)\s*mg/,
    /sodium\s*(\d+\.?\d*)/,
  ]);

  const servingSizeMatch = fullText.match(
    /serving\s*size\s*[:\s]*([^\n,]+?)(?:\s*(?:calories|amount|servings))/
  );

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    servingSize: servingSizeMatch ? servingSizeMatch[1].trim() : undefined,
  };
}
