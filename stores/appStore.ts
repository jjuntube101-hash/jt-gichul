import { create } from 'zustand';

interface AppState {
  /** 현재 선택된 답안 (문항 번호 → 선택지 번호) */
  selectedAnswers: Record<number, number>;
  /** 해설 표시 여부 (문항 번호 → boolean) */
  showExplanation: Record<number, boolean>;

  selectAnswer: (questionNo: number, choiceNum: number) => void;
  toggleExplanation: (questionNo: number) => void;
  resetQuestion: (questionNo: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedAnswers: {},
  showExplanation: {},

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
}));
