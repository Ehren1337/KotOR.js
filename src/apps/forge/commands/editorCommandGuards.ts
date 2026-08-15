/**
 * Enablement helpers for workbench commands that act on the current editor tab.
 *
 * @file editorCommandGuards.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export function tabCanCompile(tab: { canCompile?: boolean } | null | undefined): boolean {
  return !!tab && tab.canCompile === true;
}

export function tabCanSave(tab: { file?: unknown } | null | undefined): boolean {
  return !!tab?.file;
}
