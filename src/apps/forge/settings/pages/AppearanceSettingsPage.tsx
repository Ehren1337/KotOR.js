/**
 * Appearance settings (accent theming).
 *
 * @file AppearanceSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useState } from "react";
import { ForgeSelect } from "@/apps/forge/components/ui";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import {
  ForgeAccent,
  getForgeAccent,
  setForgeAccent,
} from "@/apps/forge/settings/forgeSettings";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";

const ACCENT_OPTIONS: { value: ForgeAccent; label: string }[] = [
  { value: "follow-game", label: "Follow game" },
  { value: "kotor", label: "KotOR blue" },
  { value: "tsl", label: "TSL teal" },
];

export function AppearanceSettingsPage() {
  const [accent, setAccent] = useState<ForgeAccent>(() => getForgeAccent());

  const onAccentChange = (value: ForgeAccent) => {
    setForgeAccent(value);
    setAccent(value);
  };

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">Appearance</h3>
      <p className="forge-settings-page__lead">
        Chrome stays dark. Accent color can follow the loaded game or stay fixed.
      </p>
      <SettingRow
        label="Accent color"
        description="Follow game uses KotOR blue or TSL teal from the active profile."
        keywords={["theme", "color", "accent", "kotor", "tsl"]}
      >
        <ForgeSelect
          value={accent}
          onChange={(e) => onAccentChange(e.target.value as ForgeAccent)}
          aria-label="Accent color"
        >
          {ACCENT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </ForgeSelect>
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "appearance",
  label: "Appearance",
  icon: "fa-solid fa-palette",
  keywords: ["appearance", "theme", "accent", "color"],
  render: () => React.createElement(AppearanceSettingsPage),
});
