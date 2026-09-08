"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as NavigatorWithStandalone).standalone)
  );
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) {
      setInstalled(true);
    }

    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // The web application remains fully usable when service-worker
          // registration is unavailable (for example, plain HTTP on a LAN).
        });
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setInstallPrompt(null);
  }

  if (installed || !installPrompt) return null;

  return (
    <button
      type="button"
      onClick={install}
      className="fixed bottom-4 right-4 z-[70] flex h-11 items-center gap-2 rounded-xl border border-[#cfe0ef] bg-white px-4 text-xs font-black text-[#123266] shadow-[0_12px_30px_rgba(15,39,66,0.16)] transition hover:-translate-y-0.5 hover:border-[#2587ff] hover:text-[#147efb] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2587ff]/20"
      aria-label="Установить Окно в Китай как приложение"
      title="Установить Окно в Китай"
    >
      <Download className="size-4" aria-hidden="true" />
      <span>Установить приложение</span>
    </button>
  );
}
