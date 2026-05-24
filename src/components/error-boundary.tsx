"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-background overflow-hidden">
          <div className="flex flex-col items-center justify-center space-y-6">
            <h1
              className="text-6xl font-bold text-primary tracking-tight px-2 pb-2"
              style={{
                textShadow:
                  "0 4px 15px rgba(0, 0, 0, 0.2), 0 0 2px rgba(0,0,0,0.8), -1px -1px 1px rgba(0,0,0,0.5), 1px 1px 1px rgba(0,0,0,0.5)",
              }}
            >
              <span className="font-calligraphy">Pujo</span>
              <span className="font-extrabold text-7xl">পথ</span>
            </h1>

            <p className="text-muted-foreground text-center text-sm max-w-xs">
              Something went wrong. Please refresh the page.
            </p>

            <Button
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Refresh
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
