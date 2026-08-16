import React, { useState } from "react";
import { CExoLocStringEditor } from "@/apps/forge/components/CExoLocStringEditor";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { ResRefInput } from "@/apps/forge/components/resref-input/ResRefInput";
import { ScriptResRefInput } from "@/apps/forge/components/script-resref-input/ScriptResRefInput";
import { ForgeButton, ForgeColorField, ForgeInput, ForgeSelect, ForgeTwoDAIndexField } from "@/apps/forge/components/ui";
import { isTslForgeGame } from "@/apps/forge/dlg/dlgGame";
import { formatDlgNodeLine } from "@/apps/forge/dlg/dlgLocString";
import type { ForgeDLG } from "@/apps/forge/dlg/ForgeDLG";
import { DLG_DELAY_UNSET, type ForgeDLGLink, type ForgeDLGNode, type ForgeDLGScriptParams } from "@/apps/forge/dlg/ForgeDLGTypes";
import {
  cameraAnimationHint,
  dialogAnimationRowIndex,
  dialogAnimationStoreValue,
} from "@/apps/forge/helpers/twoDAIndexOptions";
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

const FADE_TYPES = [
  { value: 0, label: "0 · None" },
  { value: 1, label: "1 · Instant out" },
  { value: 2, label: "2 · Instant in" },
  { value: 3, label: "3 · Timed in" },
  { value: 4, label: "4 · Timed out" },
];

const CAM_VID_SENTINELS = [
  { value: -1, label: "None / inherit" },
  { value: -2, label: "Disable" },
];

const PLOT_SENTINELS = [{ value: -1, label: "None" }];
const ALIEN_VO_SENTINELS = [{ value: 0, label: "None" }];

function FieldRow(props: { label: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="dlg-field">
      <label className="dlg-field__label" title={props.title}>{props.label}</label>
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

function UnsetNumberField(props: {
  value: number;
  unset: number;
  unsetLabel: string;
  onChange: (n: number) => void;
  step?: number;
  unsigned?: boolean;
}) {
  const isUnset = props.value === props.unset;
  return (
    <div className="dlg-unset-number">
      <ForgeCheckbox
        label={props.unsetLabel}
        value={isUnset}
        onChange={(v) => props.onChange(v ? props.unset : 0)}
      />
      {!isUnset ? (
        <NumInput
          value={props.value}
          step={props.step}
          onChange={(n) => props.onChange(props.unsigned ? (n >>> 0) : n)}
        />
      ) : null}
    </div>
  );
}

function SoundExistsField(props: { value: number; onChange: (n: number) => void }) {
  const flags = props.value & 0xff;
  return (
    <div className="dlg-sound-exists">
      <div className="dlg-bits" title="BYTE flags. Default 0x80; alien VO sets bits 0–1 (|= 3).">
        {Array.from({ length: 8 }, (_, bit) => (
          <label key={bit} className="dlg-bits__item">
            <input
              type="checkbox"
              checked={!!(flags & (1 << bit))}
              onChange={(e) => {
                const next = e.target.checked ? (flags | (1 << bit)) : (flags & ~(1 << bit));
                props.onChange(next & 0xff);
              }}
            />
            {bit}
          </label>
        ))}
      </div>
      <span className="dlg-field__hint">0x{flags.toString(16).padStart(2, "0")} · default 0x80; alien VO |= 3</span>
    </div>
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
              {n.id} · {formatDlgNodeLine(n, tab.textByNodeId).slice(0, 40) || n.speaker || wantKind}
            </option>
          ))}
        </ForgeSelect>
        <ForgeButton type="button" size="sm" onClick={() => tab.mutate(() => { dlg.reorderLink(ownerId, link.id, -1); })}>↑</ForgeButton>
        <ForgeButton type="button" size="sm" onClick={() => tab.mutate(() => { dlg.reorderLink(ownerId, link.id, 1); })}>↓</ForgeButton>
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
      <FieldRow label="Computer type" title="Index into comptypes.2da (ComputerBackground).">
        <ForgeTwoDAIndexField
          table="comptypes"
          value={dlg.computerType}
          onChange={(n) => set("computerType", n)}
        />
      </FieldRow>
      <FieldRow label="VO_ID"><TextInput value={dlg.voId} onChange={(s) => set("voId", s)} /></FieldRow>
      <FieldRow label="Camera model">
        <ResRefInput kind="mdl" placeholder="Camera MDL" value={dlg.cameraModel} onChange={(e) => set("cameraModel", e.target.value)} />
      </FieldRow>
      <FieldRow label="End conversation">
        <ScriptResRefInput value={dlg.endConversation} onChange={(e) => set("endConversation", e.target.value)} />
      </FieldRow>
      <FieldRow label="End abort">
        <ScriptResRefInput value={dlg.endConverAbort} onChange={(e) => set("endConverAbort", e.target.value)} />
      </FieldRow>
      <FieldRow label="Ambient track">
        <ResRefInput kind="audio" placeholder="Stream music" value={dlg.ambientTrack} onChange={(e) => set("ambientTrack", e.target.value)} />
      </FieldRow>
      <ForgeCheckbox label="Skippable" value={!!dlg.skippable} onChange={(v) => set("skippable", v ? 1 : 0)} />
      <ForgeCheckbox label="Animated cut" value={!!dlg.animatedCut} onChange={(v) => set("animatedCut", v ? 1 : 0)} />
      <ForgeCheckbox label="Unequip items" value={!!dlg.unequipItems} onChange={(v) => set("unequipItems", v ? 1 : 0)} />
      <ForgeCheckbox label="Unequip head item" value={!!dlg.unequipHeadItem} onChange={(v) => set("unequipHeadItem", v ? 1 : 0)} />
      <FieldRow label="DelayEntry">
        <UnsetNumberField
          value={dlg.delayEntry}
          unset={DLG_DELAY_UNSET}
          unsetLabel="Use default (0xFFFFFFFF)"
          unsigned
          onChange={(n) => set("delayEntry", n)}
        />
      </FieldRow>
      <FieldRow label="DelayReply">
        <UnsetNumberField
          value={dlg.delayReply}
          unset={DLG_DELAY_UNSET}
          unsetLabel="Use default (0xFFFFFFFF)"
          unsigned
          onChange={(n) => set("delayReply", n)}
        />
      </FieldRow>
      {showK2 ? (
        <>
          <FieldRow label="AlienRaceOwner" title="Fallback alienvo.2da row for owner lines.">
            <ForgeTwoDAIndexField
              table="alienvo"
              value={dlg.alienRaceOwner}
              sentinels={ALIEN_VO_SENTINELS}
              onChange={(n) => set("alienRaceOwner", n)}
            />
          </FieldRow>
          <FieldRow label="PostProcOwner"><NumInput value={dlg.postProcOwner} onChange={(n) => set("postProcOwner", n)} /></FieldRow>
          <ForgeCheckbox label="RecordNoVO" value={!!dlg.recordNoVO} onChange={(v) => set("recordNoVO", v ? 1 : 0)} />
          <ForgeCheckbox label="OldHitCheck" value={!!dlg.oldHitCheck} onChange={(v) => set("oldHitCheck", v ? 1 : 0)} />
        </>
      ) : null}
      <div className="dlg-params__title">Stunt actors</div>
      {dlg.stuntList.map((stunt, i) => (
        <div key={i} className="dlg-inline-row">
          <TextInput value={stunt.participant} onChange={(s) => tab.mutate(() => { dlg.stuntList[i].participant = s; })} />
          <ResRefInput kind="mdl" placeholder="Stunt MDL" value={stunt.stuntModel} onChange={(e) => tab.mutate(() => { dlg.stuntList[i].stuntModel = e.target.value; })} />
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
            <FieldRow label="VO_ResRef">
              <ResRefInput kind="wav" placeholder="VO wav" value={node.voResRef} onChange={(e) => patch((n) => { n.voResRef = e.target.value; })} />
            </FieldRow>
            <FieldRow label="Sound">
              <ResRefInput kind="wav" placeholder="Sound wav" value={node.sound} onChange={(e) => patch((n) => { n.sound = e.target.value; })} />
            </FieldRow>
            <FieldRow label="SoundExists" title="BYTE flags. Default 0x80; alien VO sets bits 0–1 (|= 3).">
              <SoundExistsField value={node.soundExists} onChange={(n) => patch((node) => { node.soundExists = n; })} />
            </FieldRow>
            {showK2 ? (
              <>
                <FieldRow label="Emotion" title="emotion.2da LABEL names the alienvo.2da column.">
                  <ForgeTwoDAIndexField
                    table="emotion"
                    value={node.emotion}
                    onChange={(n) => patch((item) => { item.emotion = n; })}
                  />
                </FieldRow>
                <FieldRow label="AlienRaceNode" title="alienvo.2da row. > 0 always wins when set.">
                  <ForgeTwoDAIndexField
                    table="alienvo"
                    value={node.alienRaceNode}
                    sentinels={ALIEN_VO_SENTINELS}
                    onChange={(n) => patch((item) => { item.alienRaceNode = n; })}
                  />
                </FieldRow>
                <FieldRow label="FacialAnim"><NumInput value={node.facialAnimation} onChange={(n) => patch((item) => { item.facialAnimation = n; })} /></FieldRow>
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
                  <option key={label} value={i}>{i} · {label}</option>
                ))}
              </ForgeSelect>
            </FieldRow>
            <FieldRow label="CameraID" title="GIT placeable camera, not 2DA.">
              <NumInput value={node.cameraID} onChange={(n) => patch((item) => { item.cameraID = n; })} />
            </FieldRow>
            <FieldRow label="CameraAnimation" title="CUT clip index on CameraModel (not 2DA).">
              <div className="dlg-unset-number">
                <NumInput value={node.cameraAnimation} onChange={(n) => patch((item) => { item.cameraAnimation = n; })} />
                <span className="dlg-field__hint">{cameraAnimationHint(node.cameraAnimation)}</span>
              </div>
            </FieldRow>
            <FieldRow label="CamFieldOfView">
              <UnsetNumberField
                value={node.camFieldOfView}
                unset={-1}
                unsetLabel="Default (-1)"
                step={0.1}
                onChange={(n) => patch((item) => { item.camFieldOfView = n; })}
              />
            </FieldRow>
            <FieldRow label="CamVidEffect" title="videoeffects.2da. -1 inherit; -2 disable.">
              <ForgeTwoDAIndexField
                table="videoeffects"
                value={node.camVidEffect}
                sentinels={CAM_VID_SENTINELS}
                onChange={(n) => patch((item) => { item.camVidEffect = n; })}
              />
            </FieldRow>
            <div className="dlg-params__title">Animations</div>
            {node.animations.map((animRow, i) => (
              <div key={i} className="dlg-inline-row dlg-inline-row--anim">
                <ForgeTwoDAIndexField
                  table="dialoganimations"
                  labelColumn="name"
                  value={dialogAnimationRowIndex(animRow.animation)}
                  onChange={(n) => patch((item) => {
                    item.animations[i].animation = dialogAnimationStoreValue(item.animations[i].animation, n);
                  })}
                />
                <TextInput value={animRow.participant} onChange={(s) => patch((item) => { item.animations[i].participant = s; })} />
                <ForgeButton type="button" size="sm" onClick={() => patch((item) => { item.animations.splice(i, 1); })}>Remove</ForgeButton>
              </div>
            ))}
            <ForgeButton type="button" size="sm" onClick={() => patch((n) => { n.animations.push({ animation: 0, participant: "" }); })}>
              Add animation
            </ForgeButton>
            <div className="dlg-params__title">Fade / delay</div>
            <FieldRow label="FadeType">
              <ForgeSelect value={node.fadeType} onChange={(e) => patch((item) => { item.fadeType = Number(e.target.value); })}>
                {!FADE_TYPES.some((fade) => fade.value === node.fadeType) ? (
                  <option value={node.fadeType}>{node.fadeType} · (unknown)</option>
                ) : null}
                {FADE_TYPES.map((fade) => (
                  <option key={fade.value} value={fade.value}>{fade.label}</option>
                ))}
              </ForgeSelect>
            </FieldRow>
            <FieldRow label="FadeLength"><NumInput value={node.fadeLength} onChange={(n) => patch((item) => { item.fadeLength = n; })} step={0.01} /></FieldRow>
            <FieldRow label="FadeDelay"><NumInput value={node.fadeDelay} onChange={(n) => patch((item) => { item.fadeDelay = n; })} step={0.01} /></FieldRow>
            <FieldRow label="Fade color">
              <ForgeColorField
                value={node.fadeColor}
                onChange={(rgb) => patch((item) => {
                  item.fadeColor.r = rgb.r;
                  item.fadeColor.g = rgb.g;
                  item.fadeColor.b = rgb.b;
                })}
              />
            </FieldRow>
            <FieldRow label="Delay">
              <UnsetNumberField
                value={node.delay}
                unset={DLG_DELAY_UNSET}
                unsetLabel="Use default (0xFFFFFFFF)"
                unsigned
                onChange={(n) => patch((item) => { item.delay = n; })}
              />
            </FieldRow>
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
            <FieldRow label="QuestEntry"><NumInput value={node.questEntry} onChange={(n) => patch((item) => { item.questEntry = n; })} /></FieldRow>
            <FieldRow label="PlotIndex" title="plot.2da row for GiveDialogPlotXP.">
              <ForgeTwoDAIndexField
                table="plot"
                value={node.plotIndex}
                sentinels={PLOT_SENTINELS}
                onChange={(n) => patch((item) => { item.plotIndex = n; })}
              />
            </FieldRow>
            <FieldRow label="Plot XP %"><NumInput value={node.plotXPPercentage} onChange={(n) => patch((item) => { item.plotXPPercentage = n; })} step={0.01} /></FieldRow>
            {showK2 ? (
              <FieldRow label="PostProcNode"><NumInput value={node.postProcessNode} onChange={(n) => patch((item) => { item.postProcessNode = n; })} /></FieldRow>
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
        {node.kind === "entry" ? "Entry" : "Reply"} · {node.id}
      </div>
      <NodeInspector tab={tab} dlg={dlg} node={node} showK2={showK2} onRequestAdd={props.onRequestAdd} />
    </div>
  );
}
