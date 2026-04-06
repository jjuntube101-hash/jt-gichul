'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  GraduationCap,
  Calendar,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingModalProps {
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
}

type ExamTarget = '9급' | '7급';

interface ExamDate {
  name: string;
  month: number;
  day: number;
}

interface ResolvedExamDate extends ExamDate {
  date: Date;
  dDay: number;
  label: string; // e.g. "2026.06.14"
}

const TAX_CATEGORIES = [
  '국세기본법',
  '소득세법',
  '법인세법',
  '부가가치세법',
  '상속세및증여세법',
  '지방세법',
] as const;

type TaxCategory = (typeof TAX_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXAM_SCHEDULE: Record<ExamTarget, ExamDate[]> = {
  '9급': [
    { name: '국가직 9급', month: 3, day: 22 },
    { name: '지방직 9급', month: 6, day: 14 },
  ],
  '7급': [
    { name: '국가직 7급', month: 8, day: 23 },
  ],
};

function getNextExamDates(examTarget: ExamTarget): ResolvedExamDate[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const schedule = EXAM_SCHEDULE[examTarget];
  const results: ResolvedExamDate[] = [];

  for (const exam of schedule) {
    // Try this year first
    let year = today.getFullYear();
    let date = new Date(year, exam.month - 1, exam.day);
    date.setHours(0, 0, 0, 0);

    // If the date has already passed, use next year
    if (date < today) {
      year += 1;
      date = new Date(year, exam.month - 1, exam.day);
      date.setHours(0, 0, 0, 0);
    }

    const diffMs = date.getTime() - today.getTime();
    const dDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const mm = String(exam.month).padStart(2, '0');
    const dd = String(exam.day).padStart(2, '0');

    results.push({
      ...exam,
      date,
      dDay,
      label: `${year}.${mm}.${dd}`,
    });
  }

  // Sort by nearest date
  results.sort((a, b) => a.date.getTime() - b.date.getTime());
  return results;
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? 'w-6 bg-primary'
              : i < current
                ? 'w-2 bg-primary/50'
                : 'w-2 bg-border'
          }`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

// ---------------------------------------------------------------------------
// Step 1: Name + Exam Target
// ---------------------------------------------------------------------------

function Step1({
  displayName,
  setDisplayName,
  examTarget,
  setExamTarget,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  examTarget: ExamTarget;
  setExamTarget: (v: ExamTarget) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-card-foreground">
          반갑습니다!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          맞춤 학습을 위해 몇 가지만 알려주세요
        </p>
      </div>

      {/* Display name */}
      <div>
        <label
          htmlFor="onboarding-name"
          className="mb-1.5 block text-sm font-medium text-card-foreground"
        >
          이름
        </label>
        <input
          id="onboarding-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="이름 또는 닉네임"
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          autoComplete="off"
        />
      </div>

      {/* Exam target cards */}
      <div>
        <p className="mb-2 text-sm font-medium text-card-foreground">
          시험 목표
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* 9급 Card */}
          <button
            type="button"
            onClick={() => setExamTarget('9급')}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all ${
              examTarget === '9급'
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            <BookOpen
              className={`h-8 w-8 ${
                examTarget === '9급'
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            />
            <span className="text-lg font-bold text-card-foreground">9급</span>
            <span className="text-center text-xs text-muted-foreground leading-relaxed">
              지방직 · 국가직
              <br />
              9급 세법
            </span>
            {examTarget === '9급' && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>

          {/* 7급 Card */}
          <button
            type="button"
            onClick={() => setExamTarget('7급')}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all ${
              examTarget === '7급'
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            <GraduationCap
              className={`h-8 w-8 ${
                examTarget === '7급'
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            />
            <span className="text-lg font-bold text-card-foreground">7급</span>
            <span className="text-center text-xs text-muted-foreground leading-relaxed">
              국가직
              <br />
              7급 세법
            </span>
            {examTarget === '7급' && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Exam Date
// ---------------------------------------------------------------------------

function Step2({
  examTarget,
  selectedExamName,
  setSelectedExamName,
  customDate,
  setCustomDate,
  showCustom,
  setShowCustom,
}: {
  examTarget: ExamTarget;
  selectedExamName: string | null;
  setSelectedExamName: (v: string | null) => void;
  customDate: string;
  setCustomDate: (v: string) => void;
  showCustom: boolean;
  setShowCustom: (v: boolean) => void;
}) {
  const examDates = getNextExamDates(examTarget);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-card-foreground">
          다음 시험일
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          D-day 기준으로 학습 일정을 관리해드려요
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {examDates.map((exam) => {
          const isSelected = !showCustom && selectedExamName === exam.name;
          return (
            <button
              key={exam.name}
              type="button"
              onClick={() => {
                setSelectedExamName(exam.name);
                setShowCustom(false);
              }}
              className={`flex items-center justify-between rounded-2xl border-2 px-5 py-4 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar
                  className={`h-5 w-5 ${
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                <div className="text-left">
                  <p className="font-semibold text-card-foreground">
                    {exam.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{exam.label}</p>
                </div>
              </div>
              <span
                className={`rounded-lg px-3 py-1 text-sm font-bold ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {exam.dDay === 0 ? 'D-Day' : `D-${exam.dDay}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom date */}
      {!showCustom ? (
        <button
          type="button"
          onClick={() => {
            setShowCustom(true);
            setSelectedExamName(null);
          }}
          className="text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-card-foreground"
        >
          직접 입력
        </button>
      ) : (
        <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4">
          <label
            htmlFor="custom-date"
            className="mb-2 block text-sm font-medium text-card-foreground"
          >
            시험일 직접 입력
          </label>
          <input
            id="custom-date"
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-card-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={() => {
              setShowCustom(false);
              // Re-select the first exam date if available
              const dates = getNextExamDates(examTarget);
              if (dates.length > 0) {
                setSelectedExamName(dates[0].name);
              }
            }}
            className="mt-2 text-xs text-muted-foreground underline underline-offset-2"
          >
            시험 일정에서 선택
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Weak subjects
// ---------------------------------------------------------------------------

function Step3({
  weakSubjects,
  toggleSubject,
}: {
  weakSubjects: Set<TaxCategory>;
  toggleSubject: (s: TaxCategory) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-card-foreground">
          약한 과목
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          취약 과목을 선택하면 집중 학습을 도와드려요
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {TAX_CATEGORIES.map((cat) => {
          const selected = weakSubjects.has(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleSubject(cat)}
              className={`rounded-full border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                selected
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-border bg-card text-card-foreground hover:border-primary/40'
              }`}
            >
              {selected && <Check className="mr-1 inline-block h-3.5 w-3.5" />}
              {cat}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        아직 모르겠어요? 선택하지 않고 넘어가도 괜찮아요
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function OnboardingModal({
  userId,
  onComplete,
  onSkip,
}: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const [displayName, setDisplayName] = useState('');
  const [examTarget, setExamTarget] = useState<ExamTarget>('9급');

  // Step 2 state
  const [selectedExamName, setSelectedExamName] = useState<string | null>(
    () => {
      const dates = getNextExamDates('9급');
      return dates.length > 0 ? dates[0].name : null;
    },
  );
  const [customDate, setCustomDate] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  // Step 3 state
  const [weakSubjects, setWeakSubjects] = useState<Set<TaxCategory>>(
    new Set(),
  );

  const toggleSubject = useCallback((s: TaxCategory) => {
    setWeakSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  }, []);

  // When exam target changes on step 1, recalculate the default selected exam
  const handleExamTargetChange = useCallback((target: ExamTarget) => {
    setExamTarget(target);
    const dates = getNextExamDates(target);
    setSelectedExamName(dates.length > 0 ? dates[0].name : null);
    setShowCustom(false);
    setCustomDate('');
  }, []);

  // Resolve the final exam date for saving
  const resolveExamDate = useCallback((): {
    examName: string;
    examDate: string;
  } | null => {
    if (showCustom && customDate) {
      return { examName: '직접 입력', examDate: customDate };
    }
    if (selectedExamName) {
      const dates = getNextExamDates(examTarget);
      const found = dates.find((d) => d.name === selectedExamName);
      if (found) {
        return {
          examName: found.name,
          examDate: found.date.toISOString().split('T')[0],
        };
      }
    }
    return null;
  }, [showCustom, customDate, selectedExamName, examTarget]);

  const handleNext = useCallback(async () => {
    if (step < 2) {
      setDirection(1);
      setStep((s) => s + 1);
      return;
    }

    // Final step -> save
    setSaving(true);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        console.error('Supabase client not available');
        onComplete();
        return;
      }

      const examInfo = resolveExamDate();

      const { error } = await supabase.from('user_study_profiles').upsert(
        {
          user_id: userId,
          display_name: displayName.trim() || null,
          exam_target: examTarget,
          exam_name: examInfo?.examName ?? null,
          exam_date: examInfo?.examDate ?? null,
          weak_subjects: Array.from(weakSubjects),
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

      if (error) {
        console.error('Failed to save onboarding profile:', error);
      }

      onComplete();
    } catch (err) {
      console.error('Onboarding save error:', err);
      onComplete();
    } finally {
      setSaving(false);
    }
  }, [
    step,
    userId,
    displayName,
    examTarget,
    weakSubjects,
    resolveExamDate,
    onComplete,
  ]);

  // Can proceed to next step?
  const canProceed =
    step === 0
      ? true // name is optional, exam target has default
      : step === 1
        ? showCustom
          ? customDate !== ''
          : selectedExamName !== null
        : true; // step 2: weak subjects are optional

  const buttonLabel =
    step < 2 ? '다음' : saving ? '저장 중...' : '시작하기';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onSkip}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-card-foreground transition-colors"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content area */}
        <div className="flex flex-col px-6 pb-6 pt-8">
          {/* Step dots */}
          <div className="mb-6">
            <StepDots current={step} total={3} />
          </div>

          {/* Animated step content */}
          <div className="relative min-h-[320px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                {step === 0 && (
                  <Step1
                    displayName={displayName}
                    setDisplayName={setDisplayName}
                    examTarget={examTarget}
                    setExamTarget={handleExamTargetChange}
                  />
                )}
                {step === 1 && (
                  <Step2
                    examTarget={examTarget}
                    selectedExamName={selectedExamName}
                    setSelectedExamName={setSelectedExamName}
                    customDate={customDate}
                    setCustomDate={setCustomDate}
                    showCustom={showCustom}
                    setShowCustom={setShowCustom}
                  />
                )}
                {step === 2 && (
                  <Step3
                    weakSubjects={weakSubjects}
                    toggleSubject={toggleSubject}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom actions */}
          <div className="mt-4 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed || saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-semibold text-white transition-opacity disabled:opacity-50"
            >
              {buttonLabel}
              {step < 2 && <ChevronRight className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-card-foreground transition-colors"
            >
              나중에
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
