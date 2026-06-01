"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Omit<ErrorBoundaryState, "errorInfo"> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console with full details for debugging
    console.error("[ErrorBoundary] Uncaught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    
    // Store error info for display
    this.setState({ errorInfo });

    // Send error to analytics if available
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "exception", {
        description: `${error.name}: ${error.message}`,
        fatal: true,
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === "development";
      
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-background overflow-hidden p-4">
          <div className="flex flex-col items-center justify-center space-y-6 max-w-md">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            <h1
              className="text-5xl font-bold text-primary tracking-tight text-center px-2"
              style={{
                textShadow:
                  "0 4px 15px rgba(0, 0, 0, 0.2), 0 0 2px rgba(0,0,0,0.8), -1px -1px 1px rgba(0,0,0,0.5), 1px 1px 1px rgba(0,0,0,0.5)",
              }}
            >
              <span className="font-calligraphy">Pujo</span>
              <span className="font-extrabold text-6xl">পথ</span>
            </h1>

            <div className="text-center space-y-2">
              <p className="text-foreground font-semibold">
                Something went wrong
              </p>
              <p className="text-muted-foreground text-sm">
                We're sorry for the inconvenience. Please try refreshing the page.
              </p>
            </div>

            {isDevelopment && this.state.error && (
              <details className="w-full">
                <summary className="text-xs text-muted-foreground cursor-pointer font-mono hover:text-foreground">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-3 bg-destructive/5 rounded-lg text-xs font-mono text-destructive overflow-auto max-h-40">
                  <p className="font-bold">Error:</p>
                  <p className="break-words">{this.state.error.message}</p>
                  {this.state.errorInfo && (
                    <>
                      <p className="font-bold mt-2">Component Stack:</p>
                      <p className="break-words text-[10px] whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </p>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col gap-2 w-full">
              <Button
                onClick={this.handleRefresh}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Refresh Page
              </Button>
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              If this problem persists, please contact{" "}
              <a
                href="mailto:rupamiem@gmail.com"
                className="text-primary hover:underline"
              >
                rupamiem@gmail.com
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
