/**
 * About Forge dialog: app name, game key, install path.
 *
 * @file ModalAbout.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useState } from "react";
import { ForgeButton, ForgeDialog } from "@/apps/forge/components/ui";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ModalAboutState } from "@/apps/forge/components/modal/ModalAboutState";
import * as KotOR from "@/apps/forge/KotOR";

export function ModalAbout() {
  const [show, setShow] = useState(false);

  useEffectOnce(() => {
    const onShow = () => setShow(true);
    const onHide = () => setShow(false);
    ModalAboutState.AddEventListener("onShow", onShow);
    ModalAboutState.AddEventListener("onHide", onHide);
    return () => {
      ModalAboutState.RemoveEventListener("onShow", onShow);
      ModalAboutState.RemoveEventListener("onHide", onHide);
    };
  });

  const gameKey = KotOR.ApplicationProfile.GameKey === KotOR.GameEngineType.TSL
    ? "Star Wars: Knights of the Old Republic II"
    : "Star Wars: Knights of the Old Republic";
  const profileKey = KotOR.ApplicationProfile.key || KotOR.ApplicationProfile.profile?.key || "";
  const installPath =
    KotOR.ApplicationProfile.directory ||
    KotOR.ApplicationProfile.directoryHandle?.name ||
    KotOR.ApplicationProfile.profile?.directory ||
    "";

  return (
    <ForgeDialog show={show} onHide={() => setShow(false)} size="sm">
      <ForgeDialog.Header closeButton>
        <ForgeDialog.Title>About KotOR Forge</ForgeDialog.Title>
      </ForgeDialog.Header>
      <ForgeDialog.Body>
        <p><strong>KotOR Forge</strong></p>
        <p>Game: {gameKey}{profileKey ? ` (${profileKey})` : ""}</p>
        {installPath ? <p>Install: {installPath}</p> : null}
      </ForgeDialog.Body>
      <ForgeDialog.Footer>
        <ForgeButton type="button" onClick={() => setShow(false)}>Close</ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
}
