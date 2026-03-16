import { NextRequest, NextResponse } from "next/server";
import { ProviderType } from "@/types";
import { ProviderModel, ModelCapability } from "@/lib/providers";
import { STATIC_MODELS } from "@/lib/staticModels";

// Categories we care about for image/video generation (fal.ai)
const RELEVANT_CATEGORIES = [
  "text-to-image",
  "image-to-image",
  "text-to-video",
  "image-to-video",
];

// Combine all sources (mostly static now)
const ALL_AVAILABLE_MODELS = STATIC_MODELS;

// ============ Response Types ============

interface ProviderResult {
  success: boolean;
  count: number;
  cached?: boolean;
  error?: string;
}

interface ModelsSuccessResponse {
  success: true;
  models: ProviderModel[];
  cached: boolean;
  providers: Record<string, ProviderResult>;
  errors?: string[];
}

interface ModelsErrorResponse {
  success: false;
  error: string;
}

type ModelsResponse = ModelsSuccessResponse | ModelsErrorResponse;

// ============ Helpers ============

/**
 * Filter models by search query
 */
function filterModelsBySearch(
  models: ProviderModel[],
  searchQuery: string
): ProviderModel[] {
  const searchLower = searchQuery.toLowerCase();
  return models.filter((model) => {
    const nameMatch = model.name.toLowerCase().includes(searchLower);
    const descMatch =
      model.description?.toLowerCase().includes(searchLower) || false;
    const idMatch = model.id.toLowerCase().includes(searchLower);
    return nameMatch || descMatch || idMatch;
  });
}

// ============ Main Handler ============

export async function GET(
  request: NextRequest
): Promise<NextResponse<ModelsResponse>> {
  // Parse query params
  const providerFilter = request.nextUrl.searchParams.get("provider") as
    | ProviderType
    | null;
  const searchQuery = request.nextUrl.searchParams.get("search") || undefined;
  const capabilitiesParam = request.nextUrl.searchParams.get("capabilities");
  const capabilitiesFilter: ModelCapability[] | null = capabilitiesParam
    ? (capabilitiesParam.split(",") as ModelCapability[])
    : null;

  // We are now STATIC only, so we ignore API keys for fetching logic.
  // We just serve the available models list.

  let models = [...ALL_AVAILABLE_MODELS];

  // Filter by provider
  if (providerFilter && providerFilter !== "all" as any) { // Type cast to handle 'all' if passed
    models = models.filter(m => m.provider === providerFilter);
  }

  // Filter by search
  if (searchQuery) {
    models = filterModelsBySearch(models, searchQuery);
  }

  // Filter by capabilities
  if (capabilitiesFilter && capabilitiesFilter.length > 0) {
    models = models.filter((model) =>
      model.capabilities.some((cap) => capabilitiesFilter.includes(cap))
    );
  }

  // Sort models by provider, then by name
  models.sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    return a.name.localeCompare(b.name);
  });

  const providerResults: Record<string, ProviderResult> = {};
  // Mock results for UI consistency
  const providers = new Set(models.map(m => m.provider));
  providers.forEach(p => {
    providerResults[p] = {
      success: true,
      count: models.filter(m => m.provider === p).length,
      cached: true
    };
  });

  return NextResponse.json<ModelsSuccessResponse>({
    success: true,
    models,
    cached: true,
    providers: providerResults,
  });
}
