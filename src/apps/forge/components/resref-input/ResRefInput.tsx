/**
 * Typeable ResRef field with optional KEY / folder browser.
 *
 * @file ResRefInput.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { ChangeEvent } from "react";
import { ForgeButton, ForgeInput, ForgeInputGroup } from "@/apps/forge/components/ui";
import { ModalResRefBrowserState, ResRefKind } from "@/apps/forge/states/modal/ModalResRefBrowserState";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import "@/apps/forge/components/script-resref-input/ScriptResRefInput.scss";

export interface ResRefChangeEvent {
  target: { value: string };
}

export interface ResRefInputProps {
  value: string;
  onChange: (event: ResRefChangeEvent | ChangeEvent<HTMLInputElement>) => void;
  kind?: ResRefKind;
  placeholder?: string;
  className?: string;
}

export function ResRefInput({
  value,
  onChange,
  kind = "wav",
  placeholder = "ResRef",
  className = "",
}: ResRefInputProps) {
  const onBrowse = () => {
    const modal = new ModalResRefBrowserState(kind, (resref) => {
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
      <ForgeButton type="button" size="sm" title="Browse" onClick={onBrowse}>
        <i className="fa-solid fa-folder-open" aria-hidden />
      </ForgeButton>
    </ForgeInputGroup>
  );
}
