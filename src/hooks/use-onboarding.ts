"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface OnboardingStatus {
  needsOnboarding: boolean;
  progress: number;
  currentStep: number;
}

export function useOnboardingCheck(redirectIfNeeded = false) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data: OnboardingStatus) => {
        setStatus(data);
        if (redirectIfNeeded && data.needsOnboarding) {
          router.push("/onboarding");
        }
      })
      .catch(() => {
        setStatus({ needsOnboarding: false, progress: 100, currentStep: 4 });
      })
      .finally(() => setLoading(false));
  }, [redirectIfNeeded, router]);

  return { status, loading };
}
