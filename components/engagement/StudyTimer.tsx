'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Timer, X } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTotalTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

/** 원형 프로그레스 링 SVG */
function CircularProgress({
  progress,
  size,
  strokeWidth,
  isFocus,
}: {
  progress: number; // 0~1
  size: number;
  strokeWidth: number;
  isFocus: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200 dark:text-gray-700"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={isFocus ? 'text-blue-500' : 'text-green-500'}
        stroke="currentColor"
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
    </svg>
  );
}

const FOCUS_DURATION = 1500;
const BREAK_DURATION = 300;

export default function StudyTimer() {
  const [expanded, setExpanded] = useState(false);
  const [flash, setFlash] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevModeRef = useRef<'focus' | 'break'>('focus');

  const {
    studyTimer,
    isFocusMode,
    startStudyTimer,
    pauseStudyTimer,
    resumeStudyTimer,
    stopStudyTimer,
    tickStudyTimer,
  } = useAppStore();

  const { isActive, isPaused, mode, secondsLeft, totalStudySeconds, sessionsCompleted } =
    studyTimer;

  // Detect mode change for flash effect
  useEffect(() => {
    if (prevModeRef.current !== mode && isActive) {
      setFlash(true);
      const timeout = setTimeout(() => setFlash(false), 600);
      prevModeRef.current = mode;
      return () => clearTimeout(timeout);
    }
    prevModeRef.current = mode;
  }, [mode, isActive]);

  // Tick interval
  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        tickStudyTimer();
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isPaused, tickStudyTimer]);

  const handleStart = useCallback(() => {
    startStudyTimer();
    setExpanded(true);
  }, [startStudyTimer]);

  const handleStop = useCallback(() => {
    stopStudyTimer();
    setExpanded(false);
  }, [stopStudyTimer]);

  const handleToggle = useCallback(() => {
    if (isPaused) resumeStudyTimer();
    else pauseStudyTimer();
  }, [isPaused, pauseStudyTimer, resumeStudyTimer]);

  // Don't show when in focus mode (OX drill / timer test)
  if (isFocusMode) return null;

  const isFocus = mode === 'focus';
  const totalDuration = isFocus ? FOCUS_DURATION : BREAK_DURATION;
  const progress = 1 - secondsLeft / totalDuration;

  return (
    <div className="fixed bottom-36 right-4 z-40">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`
              w-64 rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border
              ${flash
                ? isFocus
                  ? 'border-blue-400 ring-2 ring-blue-300'
                  : 'border-green-400 ring-2 ring-green-300'
                : 'border-gray-200 dark:border-gray-700'
              }
              p-4 flex flex-col items-center gap-3
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between w-full">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isFocus
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                }`}
              >
                {isFocus ? '집중 시간' : '휴식 시간'}
              </span>
              <button
                onClick={() => setExpanded(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="접기"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Circular progress + time */}
            <div className="relative flex items-center justify-center">
              <CircularProgress
                progress={progress}
                size={120}
                strokeWidth={6}
                isFocus={isFocus}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
                  {formatTime(secondsLeft)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {!isActive ? (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  <Play size={16} />
                  시작
                </button>
              ) : (
                <>
                  <button
                    onClick={handleToggle}
                    className={`p-2.5 rounded-full transition-colors ${
                      isPaused
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    aria-label={isPaused ? '재개' : '일시정지'}
                  >
                    {isPaused ? <Play size={18} /> : <Pause size={18} />}
                  </button>
                  <button
                    onClick={handleStop}
                    className="p-2.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    aria-label="정지"
                  >
                    <Square size={18} />
                  </button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="w-full border-t border-gray-100 dark:border-gray-800 pt-2 flex flex-col gap-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                오늘 총 <span className="font-semibold text-gray-700 dark:text-gray-200">{formatTotalTime(totalStudySeconds)}</span> 학습
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                {sessionsCompleted}회 완료
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setExpanded(true)}
            className={`
              relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center
              transition-colors
              ${isActive
                ? isFocus
                  ? 'bg-blue-500 text-white'
                  : 'bg-green-500 text-white'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
              }
            `}
            aria-label="학습 타이머"
          >
            {isActive ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <CircularProgress
                  progress={progress}
                  size={56}
                  strokeWidth={3}
                  isFocus={isFocus}
                />
                <span className="absolute text-[10px] font-mono font-bold">
                  {formatTime(secondsLeft)}
                </span>
              </div>
            ) : (
              <Timer size={22} />
            )}

            {/* Pulsing dot when active */}
            {isActive && !isPaused && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isFocus ? 'bg-blue-300' : 'bg-green-300'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    isFocus ? 'bg-blue-400' : 'bg-green-400'
                  }`}
                />
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
