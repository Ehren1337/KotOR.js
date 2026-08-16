/**
 * Typeable script ResRef field with optional NWScript browser.
 *
 * @file ScriptResRefInput.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { ChangeEvent } from "react";
import { ForgeButton, ForgeInput, ForgeInputGroup } from "@/apps/forge/components/ui";
import { ModalScriptBrowserState } from "@/apps/forge/states/modal/ModalScriptBrowserState";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import "@/apps/forge/components/script-resref-input/ScriptResRefInput.scss";

export interface ScriptResRefChangeEvent {
  target: { value: string };
}

export interface ScriptResRefInputProps {
  value: string;
  onChange: (event: ScriptResRefChangeEvent | ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

export function ScriptResRefInput({
  value,
  onChange,
  placeholder = "Script ResRef",
  className = "",
}: ScriptResRefInputProps) {
  const onBrowse = () => {
    const modal = new ModalScriptBrowserState((resref) => {
      onChange({ target: { value: resref } });
    });
    modal.attachToModalManager(ForgeState.modalManager);
    modal.open();
  };

  return (
    <ForgeInputGroup className="script-resref-input">
      <ForgeInput
        maxLength={16}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e)}
        aria-label={placeholder}
        className={className}
      />
      <ForgeButton type="button" size="sm" title="Browse scripts" onClick={onBrowse}>
        <i className="fa-solid fa-folder-open" aria-hidden />
      </ForgeButton>
    </ForgeInputGroup>
  );
}
