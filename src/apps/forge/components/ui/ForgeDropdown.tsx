import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

export interface ForgeDropdownProps {
  children?: React.ReactNode;
  className?: string;
  show?: boolean;
  onToggle?: (open: boolean) => void;
  align?: "start" | "end";
}

export function ForgeDropdown({
  children,
  className = "",
  show,
  onToggle,
  align = "start",
}: ForgeDropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = show ?? internalOpen;
  const rootRef = useRef<HTMLDivElement>(null);

  const setOpen = useCallback((next: boolean) => {
    if (show === undefined) setInternalOpen(next);
    onToggle?.(next);
  }, [onToggle, show]);

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [setOpen]);

  return (
    <DropdownContext.Provider value={{ open, setOpen, toggle }}>
      <div ref={rootRef} className={`forge-dropdown ${align === "end" ? "forge-dropdown--end" : ""} ${className}`.trim()}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function ForgeDropdownToggle({
  children,
  className = "",
  as: As = "button",
  size: _size,
  variant: _variant,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: any; size?: string; variant?: string }) {
  const ctx = useContext(DropdownContext);
  return (
    <As
      type={As === "button" ? "button" : undefined}
      className={`${As === "button" ? "forge-btn forge-btn--sm" : ""} ${className}`.trim()}
      aria-expanded={ctx?.open ?? false}
      onClick={(e: React.MouseEvent) => {
        rest.onClick?.(e as any);
        ctx?.toggle();
      }}
      {...rest}
    >
      {children}
    </As>
  );
}

export function ForgeDropdownMenu({
  children,
  className = "",
}: { children?: React.ReactNode; className?: string }) {
  const ctx = useContext(DropdownContext);
  if (!ctx?.open) return null;
  return (
    <div className={`forge-menu forge-dropdown__menu ${className}`.trim()} role="menu">
      {children}
    </div>
  );
}

export function ForgeDropdownItem({
  children,
  className = "",
  onClick,
  disabled,
  active,
  title,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  const ctx = useContext(DropdownContext);
  return (
    <button
      type="button"
      role="menuitem"
      title={title}
      disabled={disabled}
      className={`forge-menu__item ${active ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`.trim()}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        ctx?.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

export function ForgeDropdownHeader({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <div className={`forge-menu__header ${className}`.trim()}>{children}</div>;
}

export function ForgeDropdownDivider() {
  return <div className="forge-menu__separator" />;
}

export function ForgeDropdownItemText({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <div className={`forge-menu__header ${className}`.trim()}>{children}</div>;
}

ForgeDropdown.Toggle = ForgeDropdownToggle;
ForgeDropdown.Menu = ForgeDropdownMenu;
ForgeDropdown.Item = ForgeDropdownItem;
ForgeDropdown.Header = ForgeDropdownHeader;
ForgeDropdown.Divider = ForgeDropdownDivider;
ForgeDropdown.ItemText = ForgeDropdownItemText;
