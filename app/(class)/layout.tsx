import ClassHeader from "@/components/class/ClassHeader";
import PremiumGate from "@/components/class/PremiumGate";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JT 강의실",
  description: "이현준 세무사 강의 수강생 전용 공간",
  robots: { index: false, follow: false },
};

export default function ClassLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ClassHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <PremiumGate>{children}</PremiumGate>
      </main>
    </>
  );
}
