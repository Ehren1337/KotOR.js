/**
 * General Forge settings.
 *
 * @file GeneralSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeButton } from "@/apps/forge/components/ui";
import { ModalChangeGameState } from "@/apps/forge/components/modal/ModalChangeGame";
import { ModalSettingsState } from "@/apps/forge/components/modal/ModalSettingsState";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import * as KotOR from "@/apps/forge/KotOR";

export function GeneralSettingsPage() {
  const gameKey = KotOR.ApplicationProfile.GameKey === KotOR.GameEngineType.TSL
    ? "Knights of the Old Republic II"
    : "Knights of the Old Republic";

  const onChangeGame = () => {
    ModalSettingsState.Hide();
    ModalChangeGameState.Show();
  };

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">General</h3>
      <p className="forge-settings-page__lead">
        Application-wide settings. Game data comes from the active profile.
      </p>
      <SettingRow
        label="Game profile"
        description={`Currently using ${gameKey}. Switching games reloads Forge.`}
        keywords={["kotor", "tsl", "profile", "game"]}
      >
        <ForgeButton onClick={onChangeGame}>Change Game…</ForgeButton>
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "general",
  label: "General",
  icon: "fa-solid fa-gear",
  keywords: ["general", "app", "application", "game", "profile"],
  render: () => React.createElement(GeneralSettingsPage),
});
