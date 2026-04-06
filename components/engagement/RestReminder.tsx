'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee } from 'lucide-react';

const STORAGE_KEY = 'jt_session_start';
const REMIND_AFTER_MS = 180 * 60 * 1000; // 3 hours
const SNOOZE_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
const INITIAL_DELAY_MS = 10 * 1000; // 10 seconds grace period

export default function RestReminder() {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const snoozeUntilRef = useRef<number | null>(null);

  // Wait 10 seconds before allowing the modal to appear
  useEffect(() => {
    const timeout = setTimeout(() => setReady(true), INITIAL_DELAY_MS);
    return () => clearTimeout(timeout);
  }, []);

  // Initialize session start in localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
  }, []);

  // Check elapsed time every 60 seconds
  useEffect(() => {
    if (!ready) return;

    const check = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const elapsed = Date.now() - Number(stored);

      // Respect snooze
      if (snoozeUntilRef.current && Date.now() < snoozeUntilRef.current) {
        return;
      }

      if (elapsed >= REMIND_AFTER_MS) {
        setVisible(true);
      }
    };

    check(); // run immediately when ready
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ready]);

  const handleReset = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    snoozeUntilRef.current = null;
    setVisible(false);
  }, []);

  const handleSnooze = useCallback(() => {
    snoozeUntilRef.current = Date.now() + SNOOZE_MS;
    setVisible(false);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            {/* Icon */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Coffee size={28} className="text-primary" />
              </div>
            </div>

            {/* Title */}
            <h2 className="mb-2 text-center text-lg font-bold text-card-foreground">
              3시간 넘게 공부했어요!
            </h2>

            {/* Description */}
            <p className="mb-6 text-center text-sm text-muted-foreground">
              잠깐 쉬면 기억력이 더 좋아져요.
              <br />
              5분 스트레칭은 어때요?
            </p>

            {/* Actions */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleReset}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                쉬고 올게요
              </button>
              <button
                onClick={handleSnooze}
                className="px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-card-foreground"
              >
                조금 더 할게요
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
