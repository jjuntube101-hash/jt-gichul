"use client";

import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import OnboardingModal from "./OnboardingModal";

export default function OnboardingGate() {
  const { user } = useAuth();
  const { needsOnboarding, loading, markComplete, markSkipped } = useOnboarding();

  if (loading || !user || !needsOnboarding) return null;

  return (
    <OnboardingModal
      userId={user.id}
      onComplete={markComplete}
      onSkip={markSkipped}
    />
  );
}
