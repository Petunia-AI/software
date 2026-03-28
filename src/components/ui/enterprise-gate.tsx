"use client";

import { useRouter } from "next/navigation";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnterpriseGateProps {
  feature: string;
  description?: string;
}

export function EnterpriseGate({ feature, description }: EnterpriseGateProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="max-w-md space-y-6">
        {/* Icon */}
        <div className="relative inline-flex">
          <div className="p-5 rounded-3xl bg-gradient-to-br from-[#4A154B]/10 to-[#9B3FCB]/10 border border-[#C4A0D4]/30">
            <Lock className="h-10 w-10 text-[#4A154B]" />
          </div>
          <div className="absolute -top-1 -right-1 p-1.5 rounded-full bg-[#4A154B]">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{feature}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description ||
              `This feature is exclusively available on the Enterprise plan. Upgrade to unlock unlimited access to ${feature} and all premium capabilities.`}
          </p>
        </div>

        {/* Plan highlights */}
        <div className="bg-gradient-to-br from-[#FAF5FA] to-white border border-[#EEE8EE] rounded-2xl p-5 text-left space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#4A154B]">Enterprise includes</p>
          {[
            "AI Avatar video generation",
            "Email Drip automation",
            "Unlimited properties & leads",
            "Unlimited AI credits",
            "Dedicated onboarding",
            "24/7 priority support",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-foreground/80">
              <div className="h-1.5 w-1.5 rounded-full bg-[#4A154B] shrink-0" />
              {item}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full h-11 rounded-2xl bg-[#4A154B] hover:bg-[#611f69] text-white font-bold border-0 shadow-lg"
            onClick={() => router.push("/billing")}
          >
            Upgrade to Enterprise
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground">$199/month · Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}
