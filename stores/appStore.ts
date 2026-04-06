import { create } from 'zustand';

interface SessionStats {
  correct: number;
  wrong: number;
  startTime: number;
}

interface StudyTimerState {
  isActive: boolean;
  isPaused: boolean;
  mode: 'focus' | 'break';
  secondsLeft: number;
  totalStudySeconds: number;
  sessionsCompleted: number;
}

interface AppState {
  /** 현재 선택된 답안 (문항 번호 → 선택지 번호) */
  selectedAnswers: Record<number, number>;
  /** 해설 표시 여부 (문항 번호 → boolean) */
  showExplanation: Record<number, boolean>;

  /** 세션 추적 */
  sessionHistory: number[];
  sessionStats: SessionStats;
  showSessionSummary: boolean;

  /** 포커스 모드 (OX/타이머 진행 중 네비 숨김) */
  isFocusMode: boolean;

  /** 뽀모도로 학습 타이머 */
  studyTimer: StudyTimerState;

  selectAnswer: (questionNo: number, choiceNum: number) => void;
  toggleExplanation: (questionNo: number) => void;
  resetQuestion: (questionNo: number) => void;

  addToSession: (questionNo: number, isCorrect: boolean) => void;
  resetSession: () => void;
  triggerSessionSummary: () => void;
  dismissSessionSummary: () => void;
  setFocusMode: (on: boolean) => void;

  /** 학습 타이머 액션 */
  startStudyTimer: () => void;
  pauseStudyTimer: () => void;
  resumeStudyTimer: () => void;
  stopStudyTimer: () => void;
  tickStudyTimer: () => void;
  switchToBreak: () => void;
  switchToFocus: () => void;
}

const INITIAL_SESSION_STATS: SessionStats = { correct: 0, wrong: 0, startTime: 0 };

const FOCUS_DURATION = 1500; // 25분
const BREAK_DURATION = 300;  // 5분

const INITIAL_STUDY_TIMER: StudyTimerState = {
  isActive: false,
  isPaused: false,
  mode: 'focus',
  secondsLeft: FOCUS_DURATION,
  totalStudySeconds: 0,
  sessionsCompleted: 0,
};

function getTodayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `jt_study_time_${yyyy}-${mm}-${dd}`;
}

function loadDailyStudyTime(): { totalStudySeconds: number; sessionsCompleted: number } {
  if (typeof window === 'undefined') return { totalStudySeconds: 0, sessionsCompleted: 0 };
  try {
    const raw = localStorage.getItem(getTodayKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        totalStudySeconds: parsed.totalStudySeconds ?? 0,
        sessionsCompleted: parsed.sessionsCompleted ?? 0,
      };
    }
  } catch { /* ignore */ }
  return { totalStudySeconds: 0, sessionsCompleted: 0 };
}

function saveDailyStudyTime(totalStudySeconds: number, sessionsCompleted: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getTodayKey(), JSON.stringify({ totalStudySeconds, sessionsCompleted }));
  } catch { /* ignore */ }
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedAnswers: {},
  showExplanation: {},
  sessionHistory: [],
  sessionStats: { ...INITIAL_SESSION_STATS },
  showSessionSummary: false,
  isFocusMode: false,
  studyTimer: { ...INITIAL_STUDY_TIMER, ...loadDailyStudyTime() },

  selectAnswer: (questionNo, choiceNum) =>
    set((state) => ({
      selectedAnswers: { ...state.selectedAnswers, [questionNo]: choiceNum },
      showExplanation: { ...state.showExplanation, [questionNo]: true },
    })),

  toggleExplanation: (questionNo) =>
    set((state) => ({
      showExplanation: {
        ...state.showExplanation,
        [questionNo]: !state.showExplanation[questionNo],
      },
    })),

  resetQuestion: (questionNo) =>
    set((state) => {
      const { [questionNo]: _a, ...answers } = state.selectedAnswers;
      const { [questionNo]: _e, ...explanations } = state.showExplanation;
      return { selectedAnswers: answers, showExplanation: explanations };
    }),

  addToSession: (questionNo, isCorrect) =>
    set((state) => ({
      sessionHistory: [...state.sessionHistory, questionNo],
      sessionStats: {
        startTime: state.sessionStats.startTime || Date.now(),
        correct: state.sessionStats.correct + (isCorrect ? 1 : 0),
        wrong: state.sessionStats.wrong + (isCorrect ? 0 : 1),
      },
    })),

  resetSession: () =>
    set({ sessionHistory: [], sessionStats: { ...INITIAL_SESSION_STATS }, showSessionSummary: false }),

  triggerSessionSummary: () =>
    set((state) => ({
      showSessionSummary: state.sessionHistory.length >= 3,
    })),

  dismissSessionSummary: () =>
    set({ showSessionSummary: false }),

  setFocusMode: (on) => set({ isFocusMode: on }),

  // ── 학습 타이머 액션 ──
  startStudyTimer: () =>
    set((state) => ({
      studyTimer: {
        ...state.studyTimer,
        isActive: true,
        isPaused: false,
        mode: 'focus',
        secondsLeft: FOCUS_DURATION,
      },
    })),

  pauseStudyTimer: () =>
    set((state) => ({
      studyTimer: { ...state.studyTimer, isPaused: true },
    })),

  resumeStudyTimer: () =>
    set((state) => ({
      studyTimer: { ...state.studyTimer, isPaused: false },
    })),

  stopStudyTimer: () =>
    set((state) => {
      saveDailyStudyTime(state.studyTimer.totalStudySeconds, state.studyTimer.sessionsCompleted);
      return {
        studyTimer: {
          ...INITIAL_STUDY_TIMER,
          totalStudySeconds: state.studyTimer.totalStudySeconds,
          sessionsCompleted: state.studyTimer.sessionsCompleted,
        },
      };
    }),

  tickStudyTimer: () => {
    const state = get();
    const t = state.studyTimer;
    if (!t.isActive || t.isPaused) return;

    const isFocus = t.mode === 'focus';
    const newTotal = isFocus ? t.totalStudySeconds + 1 : t.totalStudySeconds;

    if (t.secondsLeft <= 1) {
      // Timer expired
      if (isFocus) {
        const newSessions = t.sessionsCompleted + 1;
        saveDailyStudyTime(newTotal, newSessions);
        set({
          studyTimer: {
            ...t,
            mode: 'break',
            secondsLeft: BREAK_DURATION,
            totalStudySeconds: newTotal,
            sessionsCompleted: newSessions,
          },
        });
      } else {
        // break ended → back to focus
        set({
          studyTimer: {
            ...t,
            mode: 'focus',
            secondsLeft: FOCUS_DURATION,
            totalStudySeconds: newTotal,
          },
        });
      }
    } else {
      if (isFocus && newTotal % 30 === 0) {
        saveDailyStudyTime(newTotal, t.sessionsCompleted);
      }
      set({
        studyTimer: {
          ...t,
          secondsLeft: t.secondsLeft - 1,
          totalStudySeconds: newTotal,
        },
      });
    }
  },

  switchToBreak: () =>
    set((state) => ({
      studyTimer: {
        ...state.studyTimer,
        mode: 'break',
        secondsLeft: BREAK_DURATION,
      },
    })),

  switchToFocus: () =>
    set((state) => ({
      studyTimer: {
        ...state.studyTimer,
        mode: 'focus',
        secondsLeft: FOCUS_DURATION,
      },
    })),
}));
