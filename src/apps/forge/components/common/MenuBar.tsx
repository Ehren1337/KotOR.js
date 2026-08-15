import React, { useState, useRef, useEffect, useCallback } from "react";

export interface MenuItem {
  label?: string;
  shortcut?: string;
  onClick?: () => void;
  children?: MenuItem[];
  disabled?: boolean;
  separator?: boolean;
  checked?: boolean;
}

interface MenuBarProps {
  items: MenuItem[];
}

const SUBMENU_CLOSE_DELAY_MS = 220;

export const MenuBar: React.FC<MenuBarProps> = ({ items }) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingSubmenuClose = useCallback(() => {
    if (submenuCloseTimerRef.current !== null) {
      clearTimeout(submenuCloseTimerRef.current);
      submenuCloseTimerRef.current = null;
    }
  }, []);

  const scheduleSubmenuClose = useCallback(
    (path: string) => {
      cancelPendingSubmenuClose();
      submenuCloseTimerRef.current = setTimeout(() => {
        submenuCloseTimerRef.current = null;
        setOpenSubmenu((prev) => (prev === path ? null : prev));
      }, SUBMENU_CLOSE_DELAY_MS);
    },
    [cancelPendingSubmenuClose],
  );

  useEffect(() => {
    return () => cancelPendingSubmenuClose();
  }, [cancelPendingSubmenuClose]);

  const handleMenuClick = useCallback((label?: string) => {
    setOpenMenu((prev) => (prev === label ? null : label ?? null));
    setOpenSubmenu(null);
    cancelPendingSubmenuClose();
  }, [cancelPendingSubmenuClose]);

  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.children) {
      return;
    }
    if (item.onClick) {
      item.onClick();
    }
    setOpenMenu(null);
    setOpenSubmenu(null);
    cancelPendingSubmenuClose();
  }, [cancelPendingSubmenuClose]);

  const closeAllMenus = useCallback(() => {
    cancelPendingSubmenuClose();
    setOpenMenu(null);
    setOpenSubmenu(null);
  }, [cancelPendingSubmenuClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeAllMenus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeAllMenus]);

  const renderMenuItem = (item: MenuItem, index: number, parentPath: string = "") => {
    const itemPath = `${parentPath}-${index}`;
    const hasChildren = item.children && item.children.length > 0;
    const isSubmenuOpen = openSubmenu === itemPath;

    if (item.separator) {
      return <div key={itemPath} className="forge-menu__separator" />;
    }

    return (
      <div
        key={itemPath}
        style={{ position: "relative" }}
        onMouseEnter={() => {
          if (hasChildren) {
            cancelPendingSubmenuClose();
            setOpenSubmenu(itemPath);
          }
        }}
        onMouseLeave={() => {
          if (hasChildren) {
            scheduleSubmenuClose(itemPath);
          }
        }}
      >
        <div
          className={`forge-menu__item ${item.disabled ? "is-disabled" : ""} ${isSubmenuOpen ? "is-open" : ""}`}
          onClick={() => handleItemClick(item)}
        >
          {item.checked ? <span className="forge-menu__check">✓</span> : null}
          <span>{item.label}</span>
          {hasChildren ? (
            <span className="forge-menu__arrow">▶</span>
          ) : item.shortcut ? (
            <span className="forge-menu__shortcut">{item.shortcut}</span>
          ) : null}
        </div>
        {hasChildren && isSubmenuOpen && (
          <div
            className="forge-menu forge-menu--flyout"
            onMouseEnter={() => {
              cancelPendingSubmenuClose();
              setOpenSubmenu(itemPath);
            }}
            onMouseLeave={() => scheduleSubmenuClose(itemPath)}
          >
            {item.children!.map((child, childIndex) => renderMenuItem(child, childIndex, itemPath))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={menuRef} className="forge-menubar forge-overlay-menubar">
      {items.map((item, index) => {
        const isOpen = openMenu === item.label;
        const hasChildren = item.children && item.children.length > 0;
        const handleTopClick = () => {
          if (item.disabled) return;
          if (hasChildren) {
            handleMenuClick(item.label);
          } else if (item.onClick) {
            item.onClick();
          }
        };
        return (
          <div
            key={index}
            className="forge-menubar__item"
            onMouseEnter={() => cancelPendingSubmenuClose()}
            onMouseLeave={closeAllMenus}
          >
            <button
              type="button"
              onClick={handleTopClick}
              disabled={item.disabled}
              className={`forge-menubar__label ${isOpen ? "is-open" : ""}`}
            >
              {item.label}
            </button>
            {isOpen && hasChildren && (
              <div className="forge-menu">
                {item.children!.map((child, childIndex) => renderMenuItem(child, childIndex, item.label ?? ""))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
