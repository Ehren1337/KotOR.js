import React, { useEffect, useRef, useState } from "react";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { MenuTopItem } from "@/apps/forge/MenuTopItem";

const SUBMENU_CLOSE_DELAY_MS = 180;

export const MenuItem = function(props: { item: MenuTopItem; parent?: MenuTopItem }) {
  const item: MenuTopItem = props.item;
  const parent = props.parent;
  const [open, setOpen] = useState(false);
  const [, rerender] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffectOnce(() => {
    const onRebuild = () => rerender((v) => !v);
    item.addEventListener("onRebuild", onRebuild);
    return () => item.removeEventListener("onRebuild", onRebuild);
  });

  useEffect(() => {
    if (!open || parent) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, parent]);

  const onClickRoot = () => {
    if (typeof item.onClick === "function" && !item.items.length) {
      item.onClick(item);
      return;
    }
    setOpen((v) => !v);
  };

  const onClickLeaf = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof item.onClick === "function") {
      item.onClick(item);
    }
  };

  if (item.type === "separator" || (item.type as string) === "sep") {
    return <div className="forge-menu__separator" />;
  }

  if (item.type === "title") {
    return <div className="forge-menu__header">{item.name}</div>;
  }

  const hasChildren = item.items.length > 0;

  if (!parent) {
    return (
      <div className="forge-menubar__item" ref={rootRef}>
        <button
          type="button"
          className={`forge-menubar__label ${open ? "is-open" : ""}`}
          onClick={onClickRoot}
        >
          {item.checked ? "✓ " : ""}{item.name}
        </button>
        {open && hasChildren ? (
          <div className="forge-menu">
            {item.items.map((child) => (
              <MenuItem key={`menu-item-${child.uuid}`} item={child} parent={item} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (hasChildren) {
    return (
      <div
        className={`forge-menu__item ${open ? "is-open" : ""}`}
        onMouseEnter={() => {
          cancelClose();
          setOpen(true);
        }}
        onMouseLeave={() => {
          cancelClose();
          closeTimer.current = setTimeout(() => setOpen(false), SUBMENU_CLOSE_DELAY_MS);
        }}
      >
        <span>{item.checked ? "✓ " : ""}{item.name}</span>
        <span className="forge-menu__arrow">▶</span>
        {open ? (
          <div
            className="forge-menu forge-menu--flyout"
            onMouseEnter={cancelClose}
            onMouseLeave={() => {
              cancelClose();
              closeTimer.current = setTimeout(() => setOpen(false), SUBMENU_CLOSE_DELAY_MS);
            }}
          >
            {item.items.map((child) => (
              <MenuItem key={`menu-item-${child.uuid}`} item={child} parent={item} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button type="button" className="forge-menu__item" onClick={onClickLeaf}>
      {item.checked ? <span className="forge-menu__check">✓</span> : null}
      <span className="dropdown-item-name">{item.name}</span>
    </button>
  );
};
