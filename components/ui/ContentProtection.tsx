"use client";

import { useEffect, useCallback, type ReactNode } from "react";

interface ContentProtectionProps {
  children: ReactNode;
  /** 선택 금지 영역에 적용할 추가 클래스 */
  className?: string;
}

/**
 * 콘텐츠 보호 래퍼
 * - 텍스트 선택(드래그) 금지
 * - 우클릭 컨텍스트 메뉴 차단
 * - 인쇄 시 워터마크 표시 (CSS @media print)
 * - Ctrl+C / Ctrl+A 부분 차단
 *
 * 완벽한 보호는 불가능하나, 일반적인 복사 시도를 억제합니다.
 */
export default function ContentProtection({
  children,
  className = "",
}: ContentProtectionProps) {
  const handleContextMenu = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-protected]")) {
      e.preventDefault();
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+U (소스 보기), Ctrl+S (저장) 차단
    if (e.ctrlKey && (e.key === "u" || e.key === "s")) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleContextMenu, handleKeyDown]);

  return (
    <div
      data-protected
      className={`select-none ${className}`}
      style={{ WebkitUserSelect: "none" }}
    >
      {children}
    </div>
  );
}
