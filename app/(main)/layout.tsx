import Header from "@/components/navigation/Header";
import BottomNav from "@/components/navigation/BottomNav";
import FeedbackButton from "@/components/feedback/FeedbackButton";
import AskFAB from "@/components/ai/AskFAB";
import ErrorBoundary from "@/components/ErrorBoundary";
import OnboardingGate from "@/components/onboarding/OnboardingGate";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:text-sm"
      >
        본문으로 건너뛰기
      </a>
      <Header />
      <main
        id="main-content"
        className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-6"
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <footer className="border-t border-border bg-card py-4 pb-20 text-center text-xs text-muted-foreground">
        이현준 세무사 &middot; 제이티 세무회계
      </footer>
      <FeedbackButton />
      <AskFAB />
      <OnboardingGate />
      <BottomNav />
    </>
  );
}
