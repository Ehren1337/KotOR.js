/**
 * Build labeled select options from a loaded 2DA table for Forge inspectors.
 *
 * @file twoDAIndexOptions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface TwoDAIndexSentinel {
  value: number;
  label: string;
}

export interface TwoDAIndexOption {
  value: number;
  label: string;
}

export interface TwoDALike {
  rows?: Record<string | number, Record<string, unknown>>;
  columns?: string[];
  RowCount?: number;
}

const DEFAULT_LABEL_KEYS = ["label", "LABEL", "name", "Name"];

export const TWO_DA_FILTER_THRESHOLD = 30;

/** Dialog AnimList looping band: stored value 10000+row still picks row N. */
export const DLG_ANIM_LOOP_BAND = 10000;

export function resolveTwoDALabelColumn(columns: string[] | undefined, preferred?: string): string | undefined {
  if (preferred) {
    const hit = columns?.find((column) => column.toLowerCase() === preferred.toLowerCase());
    if (hit) {
      return hit;
    }
  }
  if (!columns?.length) {
    return preferred;
  }
  for (const key of DEFAULT_LABEL_KEYS) {
    const hit = columns.find((column) => column.toLowerCase() === key.toLowerCase());
    if (hit) {
      return hit;
    }
  }
  return preferred;
}

export function twoDARowIndex(row: Record<string, unknown> | undefined): number | undefined {
  if (!row) {
    return undefined;
  }
  const fromLabel = Number(row.__rowlabel);
  if (Number.isFinite(fromLabel)) {
    return fromLabel;
  }
  const fromIndex = Number(row.__index);
  if (Number.isFinite(fromIndex)) {
    return fromIndex;
  }
  return undefined;
}

export function twoDARowLabel(row: Record<string, unknown> | undefined, labelColumn?: string): string {
  if (!row) {
    return "";
  }
  const raw = labelColumn ? row[labelColumn] : undefined;
  if (raw != null && String(raw).trim() !== "") {
    return String(raw);
  }
  for (const key of DEFAULT_LABEL_KEYS) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
}

export function formatTwoDAOptionLabel(value: number, rowLabel: string, unknown?: boolean): string {
  const text = unknown ? "(unknown)" : (rowLabel || "****");
  return `${value} \u00b7 ${text}`;
}

export function listTwoDAIndexOptions(
  table: TwoDALike | undefined,
  opts: {
    currentValue: number;
    sentinels?: TwoDAIndexSentinel[];
    labelColumn?: string;
    filter?: string;
  },
): TwoDAIndexOption[] {
  const sentinels = opts.sentinels || [];
  const seen = new Set<number>();
  const options: TwoDAIndexOption[] = [];

  for (let i = 0; i < sentinels.length; i++) {
    const sentinel = sentinels[i];
    if (seen.has(sentinel.value)) {
      continue;
    }
    seen.add(sentinel.value);
    options.push({
      value: sentinel.value,
      label: formatTwoDAOptionLabel(sentinel.value, sentinel.label),
    });
  }

  const rows = table?.rows || {};
  const labelColumn = resolveTwoDALabelColumn(table?.columns, opts.labelColumn);
  const keys = Object.keys(rows);
  for (let i = 0; i < keys.length; i++) {
    const row = rows[keys[i]];
    const value = twoDARowIndex(row);
    if (value === undefined || seen.has(value)) {
      continue;
    }
    seen.add(value);
    options.push({
      value,
      label: formatTwoDAOptionLabel(value, twoDARowLabel(row, labelColumn)),
    });
  }

  const query = (opts.filter || "").trim().toLowerCase();
  let filtered = options;
  if (query) {
    filtered = options.filter((option) => option.label.toLowerCase().includes(query) || String(option.value).includes(query));
  }

  const current = opts.currentValue;
  if (Number.isFinite(current) && !filtered.some((option) => option.value === current)) {
    const fromFull = options.find((option) => option.value === current);
    filtered = [
      {
        value: current,
        label: fromFull?.label || formatTwoDAOptionLabel(current, "", true),
      },
      ...filtered,
    ];
  }

  return filtered;
}

export function twoDATableHasRows(table: TwoDALike | undefined): boolean {
  if (!table?.rows) {
    return false;
  }
  if (typeof table.RowCount === "number") {
    return table.RowCount > 0;
  }
  return Object.keys(table.rows).length > 0;
}

export function dialogAnimationRowIndex(stored: number): number {
  if (!Number.isFinite(stored)) {
    return 0;
  }
  if (stored >= DLG_ANIM_LOOP_BAND) {
    return stored - DLG_ANIM_LOOP_BAND;
  }
  return stored;
}

export function dialogAnimationStoreValue(previous: number, pickedRow: number): number {
  if (previous >= DLG_ANIM_LOOP_BAND && previous - DLG_ANIM_LOOP_BAND === pickedRow) {
    return previous;
  }
  return pickedRow;
}

export function cameraAnimationHint(id: number): string {
  if (!Number.isFinite(id) || id < 0) {
    return "none";
  }
  return `cut${String(Math.trunc(id)).padStart(3, "0")}`;
}
