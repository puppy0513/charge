"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";
import { PortfolioAsset } from "@/lib/rebalancing";

const ASSET_TABLE = "portfolio_assets";

export type SaveRebalanceState = {
  ok: boolean;
  message: string;
};

function friendlySupabaseMessage(prefix: string, error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error);
  if (message.toLowerCase().includes("fetch failed")) {
    return `${prefix} Supabase 연결을 확인할 수 없어 기본 시드 데이터를 사용합니다.`;
  }
  return message ? `${prefix} ${message}` : prefix;
}

function toDbRow(asset: PortfolioAsset) {
  return {
    id: asset.id,
    ticker: asset.ticker,
    stock_name: asset.stock_name,
    asset_class: asset.asset_class,
    current_price: asset.current_price,
    amount: asset.amount,
    target_weight: asset.target_weight,
    display_order: asset.display_order,
    updated_at: new Date().toISOString()
  };
}

function toPortfolioAsset(row: Record<string, unknown>): PortfolioAsset {
  return {
    id: String(row.id ?? ""),
    ticker: String(row.ticker ?? ""),
    stock_name: String(row.stock_name ?? ""),
    asset_class: (row.asset_class as PortfolioAsset["asset_class"]) ?? "other",
    current_price: Number(row.current_price ?? 0),
    amount: Number(row.amount ?? 0),
    target_weight: Number(row.target_weight ?? 0),
    display_order: Number(row.display_order ?? 0),
    updated_at: row.updated_at ? String(row.updated_at) : null
  };
}

export async function loadPortfolioAssets(): Promise<{
  assets: PortfolioAsset[];
  source: "supabase" | "default" | "missing-config";
  message: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      assets: [],
      source: "missing-config",
      message: "Supabase 환경 변수가 없어 데이터를 불러오지 못했습니다."
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(ASSET_TABLE)
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      return {
        assets: [],
        source: "default",
        message: friendlySupabaseMessage("Supabase 조회에 실패했습니다.", error)
      };
    }

    if (!data || data.length === 0) {
      return {
        assets: [],
        source: "default",
        message: "Supabase 테이블에 자산이 없어 비어 있는 상태로 표시합니다."
      };
    }

    return {
      assets: (data ?? []).map((row) => toPortfolioAsset(row as Record<string, unknown>)),
      source: "supabase",
      message: "Supabase 자산 데이터를 불러왔습니다."
    };
  } catch (error) {
    return {
      assets: [],
      source: "default",
      message: friendlySupabaseMessage("Supabase 조회에 실패했습니다.", error)
    };
  }
}

export async function savePortfolioAssets(
  assets: PortfolioAsset[]
): Promise<SaveRebalanceState> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Supabase 환경 변수가 설정되지 않았습니다."
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const payload = assets.map((asset, index) =>
      toDbRow({
        ...asset,
        display_order: index + 1
      })
    );
    const ids = payload.map((row) => row.id);

    const { error: upsertError } = await supabase.from(ASSET_TABLE).upsert(payload, {
      onConflict: "id"
    });

    if (upsertError) {
      return {
        ok: false,
        message: `자산 저장 실패: ${upsertError.message}`
      };
    }

    const { data: currentAssets, error: currentAssetsError } = await supabase
      .from(ASSET_TABLE)
      .select("id");

    if (currentAssetsError) {
      return {
        ok: false,
        message: `기존 자산 조회 실패: ${currentAssetsError.message}`
      };
    }

    const rowsToDelete = (currentAssets ?? [])
      .map((row) => row.id)
      .filter((id) => !ids.includes(id));

    if (rowsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from(ASSET_TABLE)
        .delete()
        .in("id", rowsToDelete);

      if (deleteError) {
        return {
          ok: false,
          message: `기존 자산 정리 실패: ${deleteError.message}`
        };
      }
    }

    revalidatePath("/rebalancing");

    return {
      ok: true,
      message: "포트폴리오 자산을 Supabase에 저장했습니다."
    };
  } catch (error) {
    return {
      ok: false,
      message: friendlySupabaseMessage("Supabase 저장에 실패했습니다.", error)
    };
  }
}
