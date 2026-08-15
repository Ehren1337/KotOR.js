/**
 * Typed accessors for Forge application settings.
 *
 * @file forgeSettings.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ConfigClient } from "@/utility/ConfigClient";

export type ForgeAccent = "follow-game" | "kotor" | "tsl";
export type DefaultEditorKind = "native" | "gff" | "hex" | "text";

export const FORGE_ACCENT_KEY = "Forge.accent";
export const FORGE_DEFAULT_EDITORS_KEY = "Forge.defaultEditors";

export const DEFAULT_EDITOR_LABELS: Record<DefaultEditorKind, string> = {
  native: "Native editor",
  gff: "GFF editor",
  hex: "Hex editor",
  text: "Text editor",
};

const ACCENTS: ForgeAccent[] = ["follow-game", "kotor", "tsl"];
const EDITOR_KINDS: DefaultEditorKind[] = ["native", "gff", "hex", "text"];

export function isForgeAccent(value: unknown): value is ForgeAccent {
  return typeof value === "string" && ACCENTS.indexOf(value as ForgeAccent) !== -1;
}

export function isDefaultEditorKind(value: unknown): value is DefaultEditorKind {
  return typeof value === "string" && EDITOR_KINDS.indexOf(value as DefaultEditorKind) !== -1;
}

export function resolveDefaultEditorKind(ext: string, configured: unknown): DefaultEditorKind {
  const key = (ext || "").toLowerCase();
  if (!key) {
    return "native";
  }
  let kind: unknown = configured;
  if (kind && typeof kind === "object" && !Array.isArray(kind)) {
    kind = (kind as Record<string, unknown>)[key];
  }
  if (isDefaultEditorKind(kind)) {
    return kind;
  }
  return "native";
}

function readDefaultEditors(): Record<string, DefaultEditorKind> {
  const value = ConfigClient.get(FORGE_DEFAULT_EDITORS_KEY);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, DefaultEditorKind>) };
}

export function getForgeAccent(): ForgeAccent {
  const value = ConfigClient.get(FORGE_ACCENT_KEY);
  return isForgeAccent(value) ? value : "follow-game";
}

export function applyForgeAccent(accent?: ForgeAccent): void {
  if (typeof document === "undefined" || !document.documentElement) {
    return;
  }
  const value = accent ?? getForgeAccent();
  if (value === "follow-game") {
    document.documentElement.removeAttribute("data-forge-accent");
    return;
  }
  document.documentElement.setAttribute("data-forge-accent", value);
}

export function setForgeAccent(accent: ForgeAccent): void {
  const next = isForgeAccent(accent) ? accent : "follow-game";
  ConfigClient.set(FORGE_ACCENT_KEY, next);
  applyForgeAccent(next);
}

export function getDefaultEditor(ext: string): DefaultEditorKind {
  return resolveDefaultEditorKind(ext, readDefaultEditors());
}

export function setDefaultEditor(ext: string, kind: DefaultEditorKind): void {
  const key = (ext || "").toLowerCase();
  if (!key) {
    return;
  }
  const map = readDefaultEditors();
  if (kind === "native") {
    delete map[key];
  } else if (isDefaultEditorKind(kind)) {
    map[key] = kind;
  }
  ConfigClient.set(FORGE_DEFAULT_EDITORS_KEY, map);
}
