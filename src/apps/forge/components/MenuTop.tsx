import React, { useState, useCallback, memo } from "react";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { MenuTopState } from "@/apps/forge/states/MenuTopState";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { MenuBar, ForgeMenuItem } from "@/apps/forge/components/common/MenuBar";
import "@/apps/forge/commands/registerForgeCommands";

export interface MenuTopProps {
  className?: string;
}

export const MenuTop = memo(function MenuTop(props: MenuTopProps = {}) {
  const { className = '' } = props;
  const [items, setItems] = useState<ForgeMenuItem[]>(() => [...MenuTopState.items]);

  const refresh = useCallback(() => {
    MenuTopState.rebuild();
    setItems([...MenuTopState.items]);
  }, []);

  const onMenuTopItemsUpdated = useCallback(() => {
    setItems([...MenuTopState.items]);
  }, []);

  useEffectOnce(() => {
    setItems([...MenuTopState.items]);
    ForgeState.addEventListener('onRecentFilesUpdated', refresh);
    ForgeState.addEventListener('onRecentProjectsUpdated', refresh);
    ForgeState.addEventListener('onExplorerPaneToggle', refresh);
    MenuTopState.addEventListener('onMenuTopItemsUpdated', onMenuTopItemsUpdated);
    const manager = ForgeState.tabManager;
    manager?.addEventListener('onTabShow', refresh);
    manager?.addEventListener('onTabAdded', refresh);
    manager?.addEventListener('onTabRemoved', refresh);
    refresh();

    return () => {
      ForgeState.removeEventListener('onRecentFilesUpdated', refresh);
      ForgeState.removeEventListener('onRecentProjectsUpdated', refresh);
      ForgeState.removeEventListener('onExplorerPaneToggle', refresh);
      MenuTopState.removeEventListener('onMenuTopItemsUpdated', onMenuTopItemsUpdated);
      manager?.removeEventListener('onTabShow', refresh);
      manager?.removeEventListener('onTabAdded', refresh);
      manager?.removeEventListener('onTabRemoved', refresh);
    };
  });

  return (
    <MenuBar items={items} variant="flow" className={className} />
  );
});
