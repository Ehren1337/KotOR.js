import React, { useCallback, useMemo } from "react";
import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import * as KotOR from "@/apps/forge/KotOR";

const isElectron = () => {
  try {
    return KotOR.ApplicationProfile.ENV === ApplicationEnvironment.ELECTRON
      && typeof window !== "undefined"
      && typeof window.electron !== "undefined";
  } catch {
    return false;
  }
};

export const ForgeTitlebar = function ForgeTitlebar() {
  const electron = isElectron();
  const isMac = electron && !!window.electron.isMac?.();

  const minimize = useCallback(() => {
    window.electron?.minimize?.();
  }, []);

  const maximize = useCallback(() => {
    window.electron?.maximize?.();
  }, []);

  const close = useCallback(() => {
    window.electron?.close?.();
  }, []);

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (electron) maximize();
  }, [electron, maximize]);

  const controls = useMemo(() => {
    if (!electron) return null;
    return (
      <div className="forge-titlebar__controls">
        {isMac ? (
          <>
            <button type="button" className="forge-titlebar__btn forge-titlebar__btn--close" aria-label="Close" onClick={close} />
            <button type="button" className="forge-titlebar__btn forge-titlebar__btn--min" aria-label="Minimize" onClick={minimize} />
            <button type="button" className="forge-titlebar__btn forge-titlebar__btn--max" aria-label="Maximize" onClick={maximize} />
          </>
        ) : (
          <>
            <button type="button" className="forge-titlebar__btn forge-titlebar__btn--min" aria-label="Minimize" onClick={minimize}>−</button>
            <button type="button" className="forge-titlebar__btn forge-titlebar__btn--max" aria-label="Maximize" onClick={maximize}>□</button>
            <button type="button" className="forge-titlebar__btn forge-titlebar__btn--close" aria-label="Close" onClick={close}>×</button>
          </>
        )}
      </div>
    );
  }, [electron, isMac, close, maximize, minimize]);

  return (
    <div
      className={`forge-titlebar ${isMac ? "forge-titlebar--mac" : ""}`.trim()}
      onDoubleClick={onDoubleClick}
    >
      {isMac ? controls : null}
      <div className="forge-titlebar__title">KotOR Forge</div>
      {!isMac ? controls : null}
    </div>
  );
};
