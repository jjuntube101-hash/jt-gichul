/**
 * 사용자 관련 타입 정의
 */

export interface UserProfile {
  user_id: string;
  target_exam: '9급' | '7급' | null;
  streak_days: number;
  is_premium: boolean;
  premium_expires_at: string | null;
  created_at: string;
}

export interface SolveRecord {
  id: string;
  user_id: string;
  question_no: number;
  is_correct: boolean;
  selected_choice: number;
  time_spent_ms: number;
  mode: 'practice' | 'ox' | 'timer';
  created_at: string;
}

export interface OXRecord {
  id: string;
  user_id: string;
  question_no: number;
  ox_index: number;
  is_correct: boolean;
  created_at: string;
}
