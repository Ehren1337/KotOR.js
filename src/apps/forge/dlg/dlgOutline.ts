import { locStringIsEmpty, locStringPreview } from "@/apps/forge/dlg/dlgLocString";
import type { ForgeDLG } from "@/apps/forge/dlg/ForgeDLG";
import type { ForgeDLGLink, ForgeDLGNode } from "@/apps/forge/dlg/ForgeDLGTypes";

/**
 * Flatten visible outline rows from StartingList without duplicating documents.
 *
 * @file dlgOutline.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface DLGOutlineRow {
  rowId: string;
  nodeId: string;
  linkId: string;
  kind: "entry" | "reply" | "start";
  depth: number;
  expandable: boolean;
  expanded: boolean;
  shared: boolean;
  cycle: boolean;
  label: string;
}

function nodeLabel(
  node: ForgeDLGNode | undefined,
  kind: string,
  texts?: ReadonlyMap<string, string>,
): string {
  if (!node) {
    return `(missing ${kind})`;
  }
  const text = (texts?.get(node.id) ?? locStringPreview(node.text)).replace(/\s+/g, " ").trim();
  if (text) {
    return text.length > 80 ? `${text.slice(0, 77)}…` : text;
  }
  if (locStringIsEmpty(node.text) && node.links.length) {
    return "(continue)";
  }
  if (locStringIsEmpty(node.text) && !node.links.length) {
    return "(end)";
  }
  return node.speaker || node.id;
}

export function flattenDlgOutline(
  dlg: ForgeDLG,
  expanded: Set<string>,
  texts?: ReadonlyMap<string, string>,
): DLGOutlineRow[] {
  const rows: DLGOutlineRow[] = [];
  const walk = (
    links: ForgeDLGLink[],
    depth: number,
    pathIds: string[],
    ownerId: string,
  ) => {
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const node = dlg.getNode(link.targetId);
      const kind = node?.kind || (ownerId === "start" ? "entry" : "reply");
      const rowId = `${ownerId}:${link.id}:${link.targetId}`;
      const cycle = pathIds.indexOf(link.targetId) >= 0;
      const expandable = !cycle && !!node && node.links.length > 0;
      const isExpanded = expandable && expanded.has(rowId);
      rows.push({
        rowId,
        nodeId: link.targetId,
        linkId: link.id,
        kind,
        depth,
        expandable,
        expanded: isExpanded,
        shared: dlg.inboundCount(link.targetId) > 1,
        cycle,
        label: nodeLabel(node, kind, texts),
      });
      if (isExpanded && node) {
        walk(node.links, depth + 1, pathIds.concat(link.targetId), node.id);
      }
    }
  };
  walk(dlg.startingLinks, 0, [], "start");
  return rows;
}
