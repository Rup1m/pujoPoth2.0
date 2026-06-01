"use client";

import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useLanguage } from "@/hooks/use-language";
import { X, Download } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * InstallPrompt — shows a banner prompting users to install the web app.
 * Only displays when:
 * - The browser supports PWA installation
 * - The app is not already installed
 * - The user hasn't dismissed the prompt in this session
 */
export function InstallPrompt() {
  const { isInstallable, showInstallPrompt, dismissInstallPrompt } = useInstallPrompt();
  const { text } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isInstallable || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    dismissInstallPrompt();
  };

  const handleInstall = async () => {
    await showInstallPrompt();
    // If installation successful, the component will unmount via isInstallable becoming false
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 md:max-w-md md:left-auto md:right-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Download className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              {text.installApp || "Install App"}
            </p>
            <p className="text-xs opacity-90">
              {text.installAppDescription || "Access Pujoपथ directly from your home screen"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="bg-white text-primary px-3 py-1 rounded font-semibold text-sm transition-opacity hover:opacity-90 active:scale-95"
          >
            {text.install || "Install"}
          </button>
          <button
            onClick={handleDismiss}
            className="text-primary-foreground hover:opacity-80 transition-opacity p-1"
            aria-label={text.close || "Close"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
