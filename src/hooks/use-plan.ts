"use client";

import { useEffect, useState } from "react";

type PlanKey = "trial" | "starter" | "professional" | "enterprise";

interface PlanData {
  plan: PlanKey;
  planStatus: string;
}

let cache: PlanData | null = null;
let cachePromise: Promise<PlanData> | null = null;

export function usePlan() {
  const [data, setData] = useState<PlanData | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) {
      setData(cache);
      setLoading(false);
      return;
    }
    if (!cachePromise) {
      cachePromise = fetch("/api/billing")
        .then((r) => r.json())
        .then((d) => {
          cache = { plan: d.plan || "trial", planStatus: d.planStatus || "active" };
          return cache;
        })
        .catch(() => {
          cache = { plan: "trial", planStatus: "active" };
          return cache;
        });
    }
    cachePromise.then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const isEnterprise = data?.plan === "enterprise";
  const isProfessionalOrAbove = data?.plan === "professional" || data?.plan === "enterprise";

  return { plan: data?.plan ?? "trial", planStatus: data?.planStatus ?? "active", isEnterprise, isProfessionalOrAbove, loading };
}
