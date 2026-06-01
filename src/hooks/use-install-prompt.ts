/**
 * @fileoverview useInstallPrompt — manages the Web App install prompt.
 * Listens for beforeinstallprompt event and provides methods to show/dismiss the prompt.
 */

"use client";

import { useEffect, useState, useCallback } from "react";

export interface UseInstallPromptReturn {
  isInstallable: boolean;
  showInstallPrompt: () => void;
  dismissInstallPrompt: () => void;
  isInstalled: boolean;
}

/**
 * Hook to manage Web App install prompt.
 * Listens for beforeinstallprompt event and provides imperative trigger.
 */
export function useInstallPrompt(): UseInstallPromptReturn {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event for later use
      setDeferredPrompt(event);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const showInstallPrompt = useCallback(async () => {
    if (!deferredPrompt) return;

    const prompt = deferredPrompt as any;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  }, [deferredPrompt]);

  const dismissInstallPrompt = useCallback(() => {
    setDeferredPrompt(null);
    setIsInstallable(false);
  }, []);

  return {
    isInstallable,
    showInstallPrompt,
    dismissInstallPrompt,
    isInstalled,
  };
}
