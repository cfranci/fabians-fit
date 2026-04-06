import { NextRequest } from "next/server";

const USDA_API_KEY = process.env.USDA_API_KEY || "DEMO_KEY";
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  const barcode = request.nextUrl.searchParams.get("barcode");

  if (barcode) {
    // Try OpenFoodFacts first for barcode lookups
    try {
      const offRes = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
      );
      const offData = await offRes.json();

      if (offData.status === 1 && offData.product) {
        const p = offData.product;
        const n = p.nutriments || {};
        return Response.json({
          results: [
            {
              id: `off-${barcode}`,
              name: p.product_name || "Unknown Product",
              brand: p.brands || undefined,
              barcode,
              nutrition: {
                calories: Math.round(n["energy-kcal_100g"] || n["energy-kcal_serving"] || 0),
                protein: Math.round((n.proteins_100g || n.proteins_serving || 0) * 10) / 10,
                carbs: Math.round((n.carbohydrates_100g || n.carbohydrates_serving || 0) * 10) / 10,
                fat: Math.round((n.fat_100g || n.fat_serving || 0) * 10) / 10,
                fiber: Math.round((n.fiber_100g || 0) * 10) / 10,
                sugar: Math.round((n.sugars_100g || 0) * 10) / 10,
                sodium: Math.round((n.sodium_100g || 0) * 1000),
                servingSize: p.serving_size || "100g",
              },
              source: "barcode" as const,
              imageUrl: p.image_url || undefined,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }
    } catch {
      // Fall through to USDA
    }

    // Fallback to USDA
    try {
      const usdaRes = await fetch(
        `${USDA_BASE}/foods/search?api_key=${USDA_API_KEY}&query=${barcode}&pageSize=1`
      );
      const usdaData = await usdaRes.json();
      if (usdaData.foods?.length > 0) {
        const food = usdaData.foods[0];
        return Response.json({ results: [mapUsdaFood(food)] });
      }
    } catch {
      // No results
    }

    return Response.json({ results: [] });
  }

  if (query) {
    try {
      const usdaRes = await fetch(
        `${USDA_BASE}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=20`
      );
      const usdaData = await usdaRes.json();
      const results = (usdaData.foods || []).map(mapUsdaFood);
      return Response.json({ results });
    } catch {
      return Response.json({ results: [], error: "Failed to search USDA" }, { status: 500 });
    }
  }

  return Response.json({ results: [] });
}

function mapUsdaFood(food: Record<string, unknown>) {
  const nutrients = food.foodNutrients as Array<{ nutrientName: string; value: number }> || [];
  const getNutrient = (name: string) => {
    const n = nutrients.find((n) => n.nutrientName?.toLowerCase().includes(name.toLowerCase()));
    return n ? Math.round(n.value * 10) / 10 : 0;
  };

  return {
    id: `usda-${food.fdcId}`,
    name: food.description as string || "Unknown",
    brand: (food.brandName as string) || (food.brandOwner as string) || undefined,
    nutrition: {
      calories: Math.round(getNutrient("Energy")),
      protein: getNutrient("Protein"),
      carbs: getNutrient("Carbohydrate"),
      fat: getNutrient("Total lipid"),
      fiber: getNutrient("Fiber"),
      sugar: getNutrient("Sugars, total"),
      sodium: Math.round(getNutrient("Sodium")),
      servingSize: (food.servingSize as string)
        ? `${food.servingSize}${food.servingSizeUnit || "g"}`
        : "100g",
    },
    source: "usda" as const,
    createdAt: new Date().toISOString(),
  };
}
