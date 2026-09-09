"use client";

import { Download, Share2, X } from "lucide-react";
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

const IOS_GUIDE_DISMISSED_KEY = "okno-v-kitai-ios-pwa-guide-dismissed-v179";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as NavigatorWithStandalone).standalone)
  );
}

function isIosLikeDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const standalone = isStandaloneMode();
    if (standalone) {
      setInstalled(true);
    } else if (
      window.isSecureContext &&
      isIosLikeDevice() &&
      window.sessionStorage.getItem(IOS_GUIDE_DISMISSED_KEY) !== "1"
    ) {
      setShowIosGuide(true);
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
      setShowIosGuide(false);
      setInstallPrompt(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowIosGuide(false);
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

  function dismissIosGuide() {
    window.sessionStorage.setItem(IOS_GUIDE_DISMISSED_KEY, "1");
    setShowIosGuide(false);
  }

  if (installed) return null;

  if (showIosGuide) {
    return (
      <aside
        className="pwa-install-banner fixed bottom-4 left-4 right-4 z-[70] mx-auto max-w-[430px] rounded-2xl border border-[#cfe0ef] bg-white p-4 shadow-[0_16px_36px_rgba(15,39,66,0.18)] sm:left-auto sm:right-4 sm:mx-0"
        aria-label="Как установить Окно в Китай на iPhone или iPad"
      >
        <button
          type="button"
          onClick={dismissIosGuide}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg text-[#6f86a4] transition hover:bg-[#f1f6fb] hover:text-[#173368]"
          aria-label="Скрыть подсказку по установке"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <div className="flex items-start gap-3 pr-8">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf4ff] text-[#147efb]">
            <Share2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-black text-[#123266]">Установить на iPhone / iPad</p>
            <p className="mt-1 text-xs leading-5 text-[#637d9e]">
              Нажмите <b>«Поделиться»</b> в браузере и выберите <b>«На экран Домой»</b>.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  if (!installPrompt) return null;

  return (
    <button
      type="button"
      onClick={install}
      className="pwa-install-button fixed bottom-4 right-4 z-[70] flex h-11 items-center gap-2 rounded-xl border border-[#cfe0ef] bg-white px-4 text-xs font-black text-[#123266] shadow-[0_12px_30px_rgba(15,39,66,0.16)] transition hover:-translate-y-0.5 hover:border-[#2587ff] hover:text-[#147efb] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2587ff]/20"
      aria-label="Установить Окно в Китай как приложение"
      title="Установить Окно в Китай"
    >
      <Download className="size-4" aria-hidden="true" />
      <span>Установить приложение</span>
    </button>
  );
}
