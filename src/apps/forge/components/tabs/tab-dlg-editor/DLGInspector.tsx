import React, { useState } from "react";
import { CExoLocStringEditor } from "@/apps/forge/components/CExoLocStringEditor";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { ScriptResRefInput } from "@/apps/forge/components/script-resref-input/ScriptResRefInput";
import { ForgeButton, ForgeInput, ForgeSelect } from "@/apps/forge/components/ui";
import { isTslForgeGame } from "@/apps/forge/dlg/dlgGame";
import { formatDlgNodeLine } from "@/apps/forge/dlg/dlgLocString";
import type { ForgeDLG } from "@/apps/forge/dlg/ForgeDLG";
import type { ForgeDLGLink, ForgeDLGNode, ForgeDLGScriptParams } from "@/apps/forge/dlg/ForgeDLGTypes";
import { TabDLGEditorState } from "@/apps/forge/states/tabs/TabDLGEditorState";

/**
 * Node and conversation inspector for the DLG editor.
 *
 * @file DLGInspector.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

const CAMERA_ANGLES = [
  "Random",
  "Speaker",
  "Over-the-shoulder",
  "Two-shot",
  "Animated",
  "Focus / hold",
  "Placeable",
];

function FieldRow(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="dlg-field">
      <label className="dlg-field__label">{props.label}</label>
      <div className="dlg-field__ctrl">{props.children}</div>
    </div>
  );
}

function NumInput(props: { value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <ForgeInput
      type="number"
      step={props.step ?? 1}
      value={Number.isFinite(props.value) ? props.value : 0}
      onChange={(e) => props.onChange(Number(e.target.value))}
    />
  );
}

function TextInput(props: { value: string; onChange: (s: string) => void; maxLength?: number }) {
  return (
    <ForgeInput
      type="text"
      maxLength={props.maxLength}
      value={props.value || ""}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

function ScriptParamsEditor(props: {
  label: string;
  params: ForgeDLGScriptParams;
  onChange: (next: ForgeDLGScriptParams) => void;
}) {
  const p = props.params;
  const set = (partial: Partial<ForgeDLGScriptParams>) => props.onChange({ ...p, ...partial });
  return (
    <div className="dlg-params">
      <div className="dlg-params__title">{props.label}</div>
      <ForgeCheckbox label="Not (invert)" value={!!p.not} onChange={(v) => set({ not: v ? 1 : 0 })} />
      <FieldRow label="Param1"><NumInput value={p.param1} onChange={(n) => set({ param1: n })} /></FieldRow>
      <FieldRow label="Param2"><NumInput value={p.param2} onChange={(n) => set({ param2: n })} /></FieldRow>
      <FieldRow label="Param3"><NumInput value={p.param3} onChange={(n) => set({ param3: n })} /></FieldRow>
      <FieldRow label="Param4"><NumInput value={p.param4} onChange={(n) => set({ param4: n })} /></FieldRow>
      <FieldRow label="Param5"><NumInput value={p.param5} onChange={(n) => set({ param5: n })} /></FieldRow>
      <FieldRow label="String"><TextInput value={p.string} onChange={(s) => set({ string: s })} /></FieldRow>
    </div>
  );
}

function LinkEditor(props: {
  dlg: ForgeDLG;
  owner: ForgeDLGNode | "start";
  link: ForgeDLGLink;
  showK2: boolean;
  tab: TabDLGEditorState;
}) {
  const { dlg, link, showK2, tab } = props;
  const ownerId = props.owner === "start" ? "start" : props.owner.id;
  const wantKind = props.owner === "start" || props.owner.kind === "reply" ? "entry" : "reply";
  const targets = wantKind === "entry" ? dlg.entries : dlg.replies;
  return (
    <div className="dlg-link-card">
      <div className="dlg-link-card__head">
        <ForgeSelect
          value={link.targetId}
          onChange={(e) => tab.mutate(() => { link.targetId = e.target.value; dlg.restampIsChild(); })}
        >
          {targets.map((n) => (
            <option key={n.id} value={n.id}>
              {n.id} Â· {formatDlgNodeLine(n, tab.textByNodeId).slice(0, 40) || n.speaker || wantKind}
            </option>
          ))}
        </ForgeSelect>
        <ForgeButton type="button" size="sm" onClick={() => tab.mutate(() => { dlg.reorderLink(ownerId, link.id, -1); })}>â†‘</ForgeButton>
        <ForgeButton type="button" size="sm" onClick={() => tab.mutate(() => { dlg.reorderLink(ownerId, link.id, 1); })}>â†“</ForgeButton>
        <ForgeButton type="button" size="sm" onClick={() => tab.mutate(() => { dlg.removeLink(link.id); })}>Remove</ForgeButton>
      </div>
      <FieldRow label="Active">
        <ScriptResRefInput value={link.active} onChange={(e) => tab.mutate(() => { link.active = e.target.value; })} />
      </FieldRow>
      {showK2 ? (
        <>
          <FieldRow label="Active2">
            <ScriptResRefInput value={link.active2} onChange={(e) => tab.mutate(() => { link.active2 = e.target.value; })} />
          </FieldRow>
          <FieldRow label="Logic">
            <ForgeSelect value={link.logic} onChange={(e) => tab.mutate(() => { link.logic = Number(e.target.value); })}>
              <option value={0}>AND</option>
              <option value={1}>OR</option>
            </ForgeSelect>
          </FieldRow>
        </>
      ) : null}
      <details className="dlg-details">
        <summary>Link params</summary>
        <ScriptParamsEditor
          label="Link params"
          params={link.params}
          onChange={(next) => tab.mutate(() => { link.params = next; })}
        />
        {showK2 ? (
          <ScriptParamsEditor
            label="Link params 2"
            params={link.params2}
            onChange={(next) => tab.mutate(() => { link.params2 = next; })}
          />
        ) : null}
      </details>
    </div>
  );
}

function RootInspector(props: { tab: TabDLGEditorState; dlg: ForgeDLG; showK2: boolean }) {
  const { tab, dlg, showK2 } = props;
  const set = <K extends keyof ForgeDLG>(key: K, value: ForgeDLG[K]) => {
    tab.mutate((d) => { (d as ForgeDLG)[key] = value; });
  };
  return (
    <div className="dlg-inspector-pane">
      <FieldRow label="Conversation type">
        <ForgeSelect value={dlg.conversationType} onChange={(e) => set("conversationType", Number(e.target.value))}>
          <option value={0}>Conversation</option>
          <option value={1}>Computer</option>
        </ForgeSelect>
      </FieldRow>
      <FieldRow label="Computer type"><NumInput value={dlg.computerType} onChange={(n) => set("computerType", n)} /></FieldRow>
      <FieldRow label="VO_ID"><TextInput value={dlg.voId} onChange={(s) => set("voId", s)} /></FieldRow>
      <FieldRow label="Camera model"><TextInput value={dlg.cameraModel} onChange={(s) => set("cameraModel", s)} maxLength={16} /></FieldRow>
      <FieldRow label="End conversation">
        <ScriptResRefInput value={dlg.endConversation} onChange={(e) => set("endConversation", e.target.value)} />
      </FieldRow>
      <FieldRow label="End abort">
        <ScriptResRefInput value={dlg.endConverAbort} onChange={(e) => set("endConverAbort", e.target.value)} />
      </FieldRow>
      <FieldRow label="Ambient track"><TextInput value={dlg.ambientTrack} onChange={(s) => set("ambientTrack", s)} maxLength={16} /></FieldRow>
      <ForgeCheckbox label="Skippable" value={!!dlg.skippable} onChange={(v) => set("skippable", v ? 1 : 0)} />
      <ForgeCheckbox label="Animated cut" value={!!dlg.animatedCut} onChange={(v) => set("animatedCut", v ? 1 : 0)} />
      <ForgeCheckbox label="Unequip items" value={!!dlg.unequipItems} onChange={(v) => set("unequipItems", v ? 1 : 0)} />
      <ForgeCheckbox label="Unequip head item" value={!!dlg.unequipHeadItem} onChange={(v) => set("unequipHeadItem", v ? 1 : 0)} />
      <FieldRow label="DelayEntry"><NumInput value={dlg.delayEntry} onChange={(n) => set("delayEntry", n >>> 0)} /></FieldRow>
      <FieldRow label="DelayReply"><NumInput value={dlg.delayReply} onChange={(n) => set("delayReply", n >>> 0)} /></FieldRow>
      {showK2 ? (
        <>
          <FieldRow label="AlienRaceOwner"><NumInput value={dlg.alienRaceOwner} onChange={(n) => set("alienRaceOwner", n)} /></FieldRow>
          <FieldRow label="PostProcOwner"><NumInput value={dlg.postProcOwner} onChange={(n) => set("postProcOwner", n)} /></FieldRow>
          <ForgeCheckbox label="RecordNoVO" value={!!dlg.recordNoVO} onChange={(v) => set("recordNoVO", v ? 1 : 0)} />
          <ForgeCheckbox label="OldHitCheck" value={!!dlg.oldHitCheck} onChange={(v) => set("oldHitCheck", v ? 1 : 0)} />
        </>
      ) : null}
      <div className="dlg-params__title">Stunt actors</div>
      {dlg.stuntList.map((stunt, i) => (
        <div key={i} className="dlg-inline-row">
          <TextInput value={stunt.participant} onChange={(s) => tab.mutate(() => { dlg.stuntList[i].participant = s; })} />
          <TextInput value={stunt.stuntModel} onChange={(s) => tab.mutate(() => { dlg.stuntList[i].stuntModel = s; })} maxLength={16} />
          <ForgeButton type="button" size="sm" onClick={() => tab.mutate(() => { dlg.stuntList.splice(i, 1); })}>Remove</ForgeButton>
        </div>
      ))}
      <ForgeButton type="button" size="sm" onClick={() => tab.mutate(() => { dlg.stuntList.push({ participant: "", stuntModel: "" }); })}>
        Add stunt
      </ForgeButton>
    </div>
  );
}

function InspectorTabs(props: {
  tabs: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="dlg-inspector__tabs">
      {props.tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`dlg-inspector__tab${props.value === tab.id ? " is-active" : ""}`}
          onClick={() => props.onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function NodeInspector(props: {
  tab: TabDLGEditorState;
  dlg: ForgeDLG;
  node: ForgeDLGNode;
  showK2: boolean;
  onRequestAdd: (ownerId: string, kind: "entry" | "reply") => void;
}) {
  const { tab, dlg, node, showK2 } = props;
  const [pane, setPane] = useState<"line" | "links" | "scripts" | "stage">("line");
  const patch = (fn: (n: ForgeDLGNode) => void) => tab.mutate(() => fn(node));
  const waitBits: Array<{ bit: number; label: string }> = [
    { bit: 0x01, label: "Wait camera" },
    { bit: 0x02, label: "Wait VO" },
    { bit: 0x04, label: "Wait anim" },
    { bit: 0x08, label: "Wait fade" },
    { bit: 0x10, label: "Explicit delay" },
  ];

  return (
    <>
      <InspectorTabs
        tabs={[
          { id: "line", label: "Line" },
          { id: "links", label: "Links" },
          { id: "scripts", label: "Scripts" },
          { id: "stage", label: "Stage" },
        ]}
        value={pane}
        onChange={(id) => setPane(id as typeof pane)}
      />
      <div className="dlg-inspector__body">
        {pane === "line" ? (
          <div className="dlg-inspector-pane">
            <CExoLocStringEditor
              value={node.text}
              preview={tab.textByNodeId.get(node.id)}
              onChange={(value) => patch((n) => { n.text = value; })}
            />
            <FieldRow label="Speaker"><TextInput value={node.speaker} onChange={(s) => patch((n) => { n.speaker = s; })} /></FieldRow>
            <FieldRow label="Listener"><TextInput value={node.listener} onChange={(s) => patch((n) => { n.listener = s; })} /></FieldRow>
            <FieldRow label="Comment"><TextInput value={node.comment} onChange={(s) => patch((n) => { n.comment = s; })} /></FieldRow>
            <ForgeCheckbox label="Unskippable" value={!!node.nodeUnskippable} onChange={(v) => patch((n) => { n.nodeUnskippable = v ? 1 : 0; })} />
            <div className="dlg-params__title">Voice / sound</div>
            <FieldRow label="VO_ResRef"><TextInput value={node.voResRef} onChange={(s) => patch((n) => { n.voResRef = s; })} maxLength={16} /></FieldRow>
            <FieldRow label="Sound"><TextInput value={node.sound} onChange={(s) => patch((n) => { n.sound = s; })} maxLength={16} /></FieldRow>
            <FieldRow label="SoundExists"><NumInput value={node.soundExists} onChange={(n) => patch((node) => { node.soundExists = n; })} /></FieldRow>
            {showK2 ? (
              <>
                <FieldRow label="Emotion"><NumInput value={node.emotion} onChange={(n) => patch((node) => { node.emotion = n; })} /></FieldRow>
                <FieldRow label="AlienRaceNode"><NumInput value={node.alienRaceNode} onChange={(n) => patch((node) => { node.alienRaceNode = n; })} /></FieldRow>
                <FieldRow label="FacialAnim"><NumInput value={node.facialAnimation} onChange={(n) => patch((node) => { node.facialAnimation = n; })} /></FieldRow>
                <ForgeCheckbox label="RecordVO" value={!!node.recordVO} onChange={(v) => patch((n) => { n.recordVO = v ? 1 : 0; })} />
                <ForgeCheckbox label="RecordNoVO override" value={!!node.recordNoVOOverride} onChange={(v) => patch((n) => { n.recordNoVOOverride = v ? 1 : 0; })} />
                <ForgeCheckbox label="VO text changed" value={!!node.voTextChanged} onChange={(v) => patch((n) => { n.voTextChanged = v ? 1 : 0; })} />
              </>
            ) : null}
          </div>
        ) : null}
        {pane === "links" ? (
          <div className="dlg-inspector-pane">
            {node.links.map((link) => (
              <LinkEditor key={link.id} tab={tab} dlg={dlg} owner={node} link={link} showK2={showK2} />
            ))}
            <ForgeButton
              type="button"
              size="sm"
              onClick={() => props.onRequestAdd(node.id, node.kind === "entry" ? "reply" : "entry")}
            >
              Add link
            </ForgeButton>
          </div>
        ) : null}
        {pane === "scripts" ? (
          <div className="dlg-inspector-pane">
            <FieldRow label="Script">
              <ScriptResRefInput value={node.script} onChange={(e) => patch((n) => { n.script = e.target.value; })} />
            </FieldRow>
            {showK2 ? (
              <>
                <details className="dlg-details">
                  <summary>Action params</summary>
                  <ScriptParamsEditor label="Action params" params={node.scriptParams} onChange={(next) => patch((n) => { n.scriptParams = next; })} />
                </details>
                <FieldRow label="Script2">
                  <ScriptResRefInput value={node.script2} onChange={(e) => patch((n) => { n.script2 = e.target.value; n.k2Present = true; })} />
                </FieldRow>
                <details className="dlg-details">
                  <summary>Action params 2</summary>
                  <ScriptParamsEditor label="Action params 2" params={node.script2Params} onChange={(next) => patch((n) => { n.script2Params = next; })} />
                </details>
              </>
            ) : null}
          </div>
        ) : null}
        {pane === "stage" ? (
          <div className="dlg-inspector-pane">
            <div className="dlg-params__title">Camera</div>
            <FieldRow label="Angle">
              <ForgeSelect value={node.cameraAngle} onChange={(e) => patch((n) => { n.cameraAngle = Number(e.target.value); })}>
                {CAMERA_ANGLES.map((label, i) => (
                  <option key={label} value={i}>{i} Â· {label}</option>
                ))}
              </ForgeSelect>
            </FieldRow>
            <FieldRow label="CameraID"><NumInput value={node.cameraID} onChange={(n) => patch((node) => { node.cameraID = n; })} /></FieldRow>
            <FieldRow label="CameraAnimation"><NumInput value={node.cameraAnimation} onChange={(n) => patch((node) => { node.cameraAnimation = n; })} /></FieldRow>
            <FieldRow label="CamFieldOfView"><NumInput value={node.camFieldOfView} onChange={(n) => patch((node) => { node.camFieldOfView = n; })} step={0.1} /></FieldRow>
            <FieldRow label="CamVidEffect"><NumInput value={node.camVidEffect} onChange={(n) => patch((node) => { node.camVidEffect = n; })} /></FieldRow>
            <div className="dlg-params__title">Animations</div>
            {node.animations.map((animRow, i) => (
              <div key={i} className="dlg-inline-row">
                <NumInput value={animRow.animation} onChange={(n) => patch((node) => { node.animations[i].animation = n; })} />
                <TextInput value={animRow.participant} onChange={(s) => patch((node) => { node.animations[i].participant = s; })} />
                <ForgeButton type="button" size="sm" onClick={() => patch((node) => { node.animations.splice(i, 1); })}>Remove</ForgeButton>
              </div>
            ))}
            <ForgeButton type="button" size="sm" onClick={() => patch((n) => { n.animations.push({ animation: 0, participant: "" }); })}>
              Add animation
            </ForgeButton>
            <div className="dlg-params__title">Fade / delay</div>
            <FieldRow label="FadeType"><NumInput value={node.fadeType} onChange={(n) => patch((node) => { node.fadeType = n; })} /></FieldRow>
            <FieldRow label="FadeLength"><NumInput value={node.fadeLength} onChange={(n) => patch((node) => { node.fadeLength = n; })} step={0.01} /></FieldRow>
            <FieldRow label="FadeDelay"><NumInput value={node.fadeDelay} onChange={(n) => patch((node) => { node.fadeDelay = n; })} step={0.01} /></FieldRow>
            <FieldRow label="Fade R"><NumInput value={node.fadeColor.r} onChange={(n) => patch((node) => { node.fadeColor.r = n; })} step={0.01} /></FieldRow>
            <FieldRow label="Fade G"><NumInput value={node.fadeColor.g} onChange={(n) => patch((node) => { node.fadeColor.g = n; })} step={0.01} /></FieldRow>
            <FieldRow label="Fade B"><NumInput value={node.fadeColor.b} onChange={(n) => patch((node) => { node.fadeColor.b = n; })} step={0.01} /></FieldRow>
            <FieldRow label="Delay"><NumInput value={node.delay} onChange={(n) => patch((node) => { node.delay = n >>> 0; })} /></FieldRow>
            {waitBits.map((bit) => (
              <ForgeCheckbox
                key={bit.bit}
                label={bit.label}
                value={!!(node.waitFlags & bit.bit)}
                onChange={(v) => patch((n) => {
                  n.waitFlags = v ? (n.waitFlags | bit.bit) : (n.waitFlags & ~bit.bit);
                })}
              />
            ))}
            <div className="dlg-params__title">Quest / plot</div>
            <FieldRow label="Quest"><TextInput value={node.quest} onChange={(s) => patch((n) => { n.quest = s; })} /></FieldRow>
            <FieldRow label="QuestEntry"><NumInput value={node.questEntry} onChange={(n) => patch((node) => { node.questEntry = n; })} /></FieldRow>
            <FieldRow label="PlotIndex"><NumInput value={node.plotIndex} onChange={(n) => patch((node) => { node.plotIndex = n; })} /></FieldRow>
            <FieldRow label="Plot XP %"><NumInput value={node.plotXPPercentage} onChange={(n) => patch((node) => { node.plotXPPercentage = n; })} step={0.01} /></FieldRow>
            {showK2 ? (
              <FieldRow label="PostProcNode"><NumInput value={node.postProcessNode} onChange={(n) => patch((node) => { node.postProcessNode = n; })} /></FieldRow>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

export function DLGInspector(props: {
  tab: TabDLGEditorState;
  onRequestAdd: (ownerId: string, kind: "entry" | "reply") => void;
}) {
  const tab = props.tab;
  const dlg = tab.dlg;
  const showK2 = dlg.k2Present || isTslForgeGame();
  const node = tab.selectedId && tab.selectedId !== "root" ? dlg.getNode(tab.selectedId) : undefined;
  const [rootPane, setRootPane] = useState<"settings" | "starts">("settings");

  if (!node) {
    return (
      <div className="dlg-inspector">
        <div className="dlg-inspector__banner">Conversation</div>
        <InspectorTabs
          tabs={[
            { id: "settings", label: "Settings" },
            { id: "starts", label: "Starts" },
          ]}
          value={rootPane}
          onChange={(id) => setRootPane(id as typeof rootPane)}
        />
        <div className="dlg-inspector__body">
          {rootPane === "settings" ? (
            <RootInspector tab={tab} dlg={dlg} showK2={showK2} />
          ) : (
            <div className="dlg-inspector-pane">
              {dlg.startingLinks.map((link) => (
                <LinkEditor key={link.id} tab={tab} dlg={dlg} owner="start" link={link} showK2={showK2} />
              ))}
              <ForgeButton
                type="button"
                size="sm"
                onClick={() => props.onRequestAdd("start", "entry")}
              >
                Add start
              </ForgeButton>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dlg-inspector">
      <div className="dlg-inspector__banner">
        {node.kind === "entry" ? "Entry" : "Reply"} Â· {node.id}
      </div>
      <NodeInspector tab={tab} dlg={dlg} node={node} showK2={showK2} onRequestAdd={props.onRequestAdd} />
    </div>
  );
}
