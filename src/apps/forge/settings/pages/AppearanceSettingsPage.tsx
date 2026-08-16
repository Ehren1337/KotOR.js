/**
 * Appearance settings: per-game color theme and VS Code-style color designer.
 *
 * @file AppearanceSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useEffect, useMemo, useState } from "react";
import { ForgeButton, ForgeInput, ForgeSelect } from "@/apps/forge/components/ui";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { GameEngineType } from "@/enums/engine";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { registerSettingsPage, settingMatchesQuery } from "@/apps/forge/settings/settingsRegistry";
import {
  FORGE_THEME_TOKENS,
  ForgeGameThemeKey,
  ForgeThemeColorGroup,
  ForgeThemeColorKey,
  addForgeThemeChangeListener,
  colorToPickerValue,
  duplicateForgeTheme,
  exportForgeThemeToFile,
  getAppliedForgeThemeId,
  getForgeThemeDefinition,
  getThemeByGame,
  installForgeThemeFromFile,
  listForgeThemes,
  removeForgeThemeChangeListener,
  resetThemeColor,
  resetThemeCustomizations,
  resolveForgeTheme,
  setThemeColor,
  setThemeForGame,
} from "@/apps/forge/settings/forgeTheme";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";

const GROUPS: ForgeThemeColorGroup[] = ["Background", "Text", "Borders", "Accent", "Status"];

function currentGameSlot(): ForgeGameThemeKey {
  return ApplicationProfile.GameKey === GameEngineType.TSL ? "TSL" : "KOTOR";
}

export function AppearanceSettingsPage() {
  const [, setRevision] = useState(0);
  const [tokenQuery, setTokenQuery] = useState("");
  const bump = () => setRevision((value) => value + 1);

  useEffectOnce(() => {
    addForgeThemeChangeListener(bump);
    return () => removeForgeThemeChangeListener(bump);
  });

  const themes = listForgeThemes();
  const themeByGame = getThemeByGame();
  const activeId = getAppliedForgeThemeId() || themeByGame[currentGameSlot()];
  const resolved = resolveForgeTheme(activeId);
  const definition = getForgeThemeDefinition(resolved.id);

  const onGameThemeChange = (slot: ForgeGameThemeKey, themeId: string) => {
    setThemeForGame(slot, themeId, slot === currentGameSlot());
    bump();
  };

  const onDesignerThemeChange = (themeId: string) => {
    setThemeForGame(currentGameSlot(), themeId, true);
    bump();
  };

  const onDuplicate = () => {
    const suggested = `${resolved.name} copy`;
    const name = typeof window !== "undefined"
      ? window.prompt("Duplicate theme as", suggested)
      : suggested;
    if (name === null) {
      return;
    }
    const copy = duplicateForgeTheme(resolved.id, name);
    setThemeForGame(currentGameSlot(), copy.id, true);
    bump();
  };

  const onExport = async () => {
    try {
      await exportForgeThemeToFile(resolved.id);
    } catch (error) {
      console.error(error);
      window.alert("Could not export this color theme.");
    }
  };

  const onInstall = async () => {
    try {
      const installed = await installForgeThemeFromFile();
      if (installed) {
        bump();
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Could not install this color theme.";
      window.alert(message);
    }
  };

  const visibleTokens = useMemo(() => {
    return FORGE_THEME_TOKENS.filter((token) => {
      return settingMatchesQuery(
        tokenQuery,
        token.key,
        token.label,
        token.description,
        token.group,
      );
    });
  }, [tokenQuery]);

  const themeOptions = themes.map((theme) => (
    <option key={theme.id} value={theme.id}>
      {theme.name}{theme.builtIn ? "" : " (custom)"}
    </option>
  ));

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">Appearance</h3>
      <p className="forge-settings-page__lead">
        Choose which color theme each game loads, then customize tokens like VS Code workbench colors.
      </p>
      <SettingRow
        label="Theme for Knights of the Old Republic"
        description="Used when the KotOR profile is active."
        keywords={["theme", "color", "kotor", "dark", "light"]}
      >
        <ForgeSelect
          value={themeByGame.KOTOR}
          onChange={(e) => onGameThemeChange("KOTOR", e.target.value)}
          aria-label="KotOR color theme"
        >
          {themeOptions}
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Theme for Knights of the Old Republic II"
        description="Used when the TSL profile is active."
        keywords={["theme", "color", "tsl", "dark", "light"]}
      >
        <ForgeSelect
          value={themeByGame.TSL}
          onChange={(e) => onGameThemeChange("TSL", e.target.value)}
          aria-label="TSL color theme"
        >
          {themeOptions}
        </ForgeSelect>
      </SettingRow>

      <div className="forge-theme-designer">
        <div className="forge-theme-designer__header">
          <div>
            <h4 className="forge-theme-designer__title">Color Theme Designer</h4>
            <p className="forge-theme-designer__lead">
              Editing {resolved.name}
              {definition.builtIn ? " — changes are saved as customizations" : ""}.
              Export a .forge-theme.json to share it, or install one from a file.
            </p>
          </div>
          <div className="forge-theme-designer__actions">
            <ForgeSelect
              value={resolved.id}
              onChange={(e) => onDesignerThemeChange(e.target.value)}
              aria-label="Theme to customize"
            >
              {themeOptions}
            </ForgeSelect>
            <ForgeButton size="sm" onClick={onDuplicate}>Duplicate Theme…</ForgeButton>
            <ForgeButton size="sm" onClick={() => { void onExport(); }}>Export Theme…</ForgeButton>
            <ForgeButton size="sm" onClick={() => { void onInstall(); }}>Install Theme…</ForgeButton>
            <ForgeButton size="sm" onClick={() => { resetThemeCustomizations(resolved.id); bump(); }}>
              Reset All
            </ForgeButton>
          </div>
        </div>
        <ForgeInput
          type="search"
          placeholder="Search color tokens"
          value={tokenQuery}
          onChange={(e) => setTokenQuery(e.target.value)}
          aria-label="Search color tokens"
          className="forge-theme-designer__search"
        />
        {GROUPS.map((group) => {
          const tokens = visibleTokens.filter((token) => token.group === group);
          if (!tokens.length) {
            return null;
          }
          return (
            <div key={group} className="forge-theme-designer__group">
              <h5 className="forge-theme-designer__group-title">{group}</h5>
              <table className="forge-theme-designer__table">
                <tbody>
                  {tokens.map((token) => (
                    <ThemeColorRow
                      key={token.key}
                      themeId={resolved.id}
                      colorKey={token.key}
                      label={token.label}
                      description={token.description}
                      value={resolved.colors[token.key]}
                      defaultValue={definition.colors[token.key]}
                      onChanged={bump}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {!visibleTokens.length ? (
          <p className="forge-settings-page__empty">No color tokens match this search.</p>
        ) : null}
      </div>
    </div>
  );
}

function ThemeColorRow(props: {
  themeId: string;
  colorKey: ForgeThemeColorKey;
  label: string;
  description: string;
  value: string;
  defaultValue: string;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState(props.value);

  useEffect(() => {
    setDraft(props.value);
  }, [props.value, props.themeId, props.colorKey]);

  const commit = (next: string) => {
    const trimmed = next.trim();
    if (!trimmed || trimmed === props.value) {
      setDraft(props.value);
      return;
    }
    setThemeColor(props.themeId, props.colorKey, trimmed);
    props.onChanged();
  };

  const customized = props.value !== props.defaultValue;

  return (
    <tr className={customized ? "is-customized" : undefined}>
      <td className="forge-theme-designer__swatch-cell">
        <input
          type="color"
          className="forge-theme-designer__swatch"
          value={colorToPickerValue(draft)}
          aria-label={`${props.label} color`}
          onChange={(e) => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
        />
      </td>
      <td>
        <div className="forge-theme-designer__token">{props.colorKey}</div>
        <div className="forge-theme-designer__label">{props.label}</div>
        <div className="forge-theme-designer__desc">{props.description}</div>
      </td>
      <td className="forge-theme-designer__value-cell">
        <ForgeInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit((e.target as HTMLInputElement).value);
            }
          }}
          aria-label={`${props.label} value`}
        />
      </td>
      <td className="forge-theme-designer__reset-cell">
        <ForgeButton
          size="sm"
          disabled={!customized}
          onClick={() => {
            resetThemeColor(props.themeId, props.colorKey);
            props.onChanged();
          }}
        >
          Reset
        </ForgeButton>
      </td>
    </tr>
  );
}

registerSettingsPage({
  id: "appearance",
  label: "Appearance",
  icon: "fa-solid fa-palette",
  keywords: ["appearance", "theme", "accent", "color", "light", "dark", "kotor", "tsl", "export", "install"],
  render: () => React.createElement(AppearanceSettingsPage),
});
