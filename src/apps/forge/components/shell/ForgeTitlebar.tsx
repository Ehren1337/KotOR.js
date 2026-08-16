import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import * as KotOR from "@/apps/forge/KotOR";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenEnabled?: boolean;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const isElectron = () => {
  try {
    return KotOR.ApplicationProfile.ENV === ApplicationEnvironment.ELECTRON
      && typeof window !== "undefined"
      && typeof window.electron !== "undefined";
  } catch {
    return false;
  }
};

const getFullscreenElement = (): Element | null => {
  const doc = document as FullscreenDocument;
  return document.fullscreenElement || doc.webkitFullscreenElement || null;
};

const toggleBrowserFullscreen = () => {
  const doc = document as FullscreenDocument;
  if (getFullscreenElement()) {
    const exit = document.exitFullscreen?.bind(document) || doc.webkitExitFullscreen?.bind(doc);
    void exit?.();
    return;
  }

  const target = (document.getElementById("root") as FullscreenElement | null)
    || (document.body as FullscreenElement)
    || (document.documentElement as FullscreenElement);
  const request = target.requestFullscreen?.bind(target) || target.webkitRequestFullscreen?.bind(target);
  if (!request) {
    console.error("Fullscreen is not available in this browser");
    return;
  }
  try {
    const result = request();
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch((err) => {
        console.error("Fullscreen toggle failed", err);
      });
    }
  } catch (err) {
    console.error("Fullscreen toggle failed", err);
  }
};

export interface ForgeTitlebarProps {
  children?: ReactNode;
}

export const ForgeTitlebar = function ForgeTitlebar({ children }: ForgeTitlebarProps) {
  const electron = isElectron();
  const isMac = electron && !!window.electron.isMac?.();
  const [isFullscreen, setIsFullscreen] = useState(() => {
    try {
      return !!getFullscreenElement();
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (electron) return;
    const onChange = () => setIsFullscreen(!!getFullscreenElement());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
    };
  }, [electron]);

  const minimize = useCallback(() => {
    window.electron?.minimize?.();
  }, []);

  const maximize = useCallback(() => {
    window.electron?.maximize?.();
  }, []);

  const close = useCallback(() => {
    window.electron?.close?.();
  }, []);

  const onFullscreenClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBrowserFullscreen();
  }, []);

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, .forge-menubar, .forge-titlebar__controls")) return;
    if (electron) maximize();
  }, [electron, maximize]);

  const macControls = useMemo(() => {
    if (!isMac) return null;
    return (
      <div className="forge-titlebar__controls forge-titlebar__controls--mac">
        <button type="button" className="forge-titlebar__btn forge-titlebar__btn--close" aria-label="Close" onClick={close} />
        <button type="button" className="forge-titlebar__btn forge-titlebar__btn--min" aria-label="Minimize" onClick={minimize} />
        <button type="button" className="forge-titlebar__btn forge-titlebar__btn--max" aria-label="Maximize" onClick={maximize} />
      </div>
    );
  }, [isMac, close, maximize, minimize]);

  const trailingControls = useMemo(() => {
    if (isMac) return null;
    if (electron) {
      return (
        <div className="forge-titlebar__controls">
          <button type="button" className="forge-titlebar__btn forge-titlebar__btn--min" aria-label="Minimize" onClick={minimize}>−</button>
          <button type="button" className="forge-titlebar__btn forge-titlebar__btn--max" aria-label="Maximize" onClick={maximize}>□</button>
          <button type="button" className="forge-titlebar__btn forge-titlebar__btn--close" aria-label="Close" onClick={close}>×</button>
        </div>
      );
    }
    return (
      <div className="forge-titlebar__controls">
        <button
          type="button"
          className="forge-titlebar__btn forge-titlebar__btn--fullscreen"
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          title={isFullscreen ? "Exit full screen" : "Full screen"}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onFullscreenClick}
        >
          <i className={`fa-solid ${isFullscreen ? "fa-compress" : "fa-expand"}`} aria-hidden />
        </button>
      </div>
    );
  }, [electron, isMac, isFullscreen, close, maximize, minimize, onFullscreenClick]);

  return (
    <div
      className={`forge-titlebar${electron ? " forge-titlebar--electron" : ""}${isMac ? " forge-titlebar--mac" : ""}`.trim()}
      onDoubleClick={onDoubleClick}
    >
      {macControls}
      <div className="forge-titlebar__menus">
        {children}
      </div>
      <div className="forge-titlebar__title">KotOR Forge</div>
      {trailingControls}
    </div>
  );
};

