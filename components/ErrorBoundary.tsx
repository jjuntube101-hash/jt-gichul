'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
            {/* Icon */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-2xl">
                ⚠️
              </div>
            </div>

            {/* Title */}
            <h2 className="mb-2 text-lg font-bold text-card-foreground">
              문제가 발생했어요
            </h2>

            {/* Description */}
            <p className="mb-6 text-sm text-muted-foreground">
              새로고침하면 해결될 수 있어요
            </p>

            {/* Actions */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={this.handleReload}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                새로고침
              </button>
              <a
                href="/"
                className="text-xs text-muted-foreground transition-colors hover:text-card-foreground"
              >
                홈으로
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
