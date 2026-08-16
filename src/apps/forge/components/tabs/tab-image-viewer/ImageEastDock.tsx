/**
 * East dock: layers, TPC encode, TXI.
 *
 * @file ImageEastDock.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useEffect, useState } from "react";
import MonacoEditor from "react-monaco-editor";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import {
  IMAGE_BLEND_MODES,
  getActiveLayer,
  type ImageBlendMode,
  type ImageEastPane,
} from "@/apps/forge/image";
import { validateTxi } from "@/apps/forge/txi/txiSchema";
import {
  addForgeThemeChangeListener,
  getMonacoThemeForLanguage,
  removeForgeThemeChangeListener,
} from "@/apps/forge/settings/forgeTheme";
import type { TabImageViewerState } from "@/apps/forge/states/tabs/TabImageViewerState";

const PANES: { id: ImageEastPane; label: string }[] = [
  { id: "layers", label: "Layers" },
  { id: "encode", label: "Encode" },
  { id: "txi", label: "TXI" },
];

export function ImageEastDock(props: { tab: TabImageViewerState }) {
  const tab = props.tab;
  return (
    <div className="image-east">
      <div className="image-east__tabs">
        {PANES.map((pane) => (
          <button
            key={pane.id}
            type="button"
            className={`image-east__tab${tab.eastPane === pane.id ? " is-active" : ""}`}
            onClick={() => tab.setEastPane(pane.id)}
          >
            {pane.label}
          </button>
        ))}
      </div>
      <div className="image-east__body">
        {tab.eastPane === "layers" ? <ImageLayerPanel tab={tab} /> : null}
        {tab.eastPane === "encode" ? <ImageEncodePanel tab={tab} /> : null}
        {tab.eastPane === "txi" ? <ImageTxiPanel tab={tab} /> : null}
      </div>
    </div>
  );
}

function ImageLayerPanel(props: { tab: TabImageViewerState }) {
  const tab = props.tab;
  const layers = tab.document.layers.slice().reverse();
  return (
    <div className="image-layers">
      <div className="image-layers__toolbar">
        <button type="button" className="image-btn" onClick={() => tab.newLayer()}>New</button>
        <button type="button" className="image-btn image-btn--secondary" onClick={() => tab.duplicateActiveLayer()}>Dup</button>
        <button type="button" className="image-btn image-btn--secondary" onClick={() => tab.deleteActiveLayer()}>Del</button>
        <button type="button" className="image-btn image-btn--secondary" onClick={() => tab.moveActiveLayer(1)}>Up</button>
        <button type="button" className="image-btn image-btn--secondary" onClick={() => tab.moveActiveLayer(-1)}>Down</button>
      </div>
      <div className="image-layers__list">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`image-layer${layer.id === tab.document.activeLayerId ? " is-active" : ""}`}
            onClick={() => {
              tab.document.activeLayerId = layer.id;
              tab.notifyUi();
            }}
          >
            <input
              type="checkbox"
              checked={layer.visible}
              onChange={(e) => {
                e.stopPropagation();
                tab.mutate((doc) => {
                  const found = doc.layers.find((item) => item.id === layer.id);
                  if (found) found.visible = e.target.checked;
                });
              }}
            />
            <input
              className="image-layer__name"
              value={layer.name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const name = e.target.value;
                tab.mutate((doc) => {
                  const found = doc.layers.find((item) => item.id === layer.id);
                  if (found) found.name = name;
                }, { history: false });
              }}
            />
            <select
              value={layer.blend}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const blend = e.target.value as ImageBlendMode;
                tab.mutate((doc) => {
                  const found = doc.layers.find((item) => item.id === layer.id);
                  if (found) found.blend = blend;
                });
              }}
            >
              {IMAGE_BLEND_MODES.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(layer.opacity * 100)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const opacity = Number(e.target.value) / 100;
                tab.mutate((doc) => {
                  const found = doc.layers.find((item) => item.id === layer.id);
                  if (found) found.opacity = opacity;
                }, { history: false });
              }}
            />
          </div>
        ))}
      </div>
      <div className="image-layers__toolbar">
        <label>
          <input
            type="checkbox"
            checked={!!getActiveLayer(tab.document)?.lockTransparent}
            onChange={(e) => {
              tab.mutate((doc) => {
                const layer = getActiveLayer(doc);
                if (layer) layer.lockTransparent = e.target.checked;
              });
            }}
          />
          Lock transparent
        </label>
      </div>
    </div>
  );
}

function ImageEncodePanel(props: { tab: TabImageViewerState }) {
  const encode = props.tab.document.encode;
  return (
    <div className="image-encode">
      <label>
        Mip maps
        <select
          value={encode.mipPolicy}
          onChange={(e) => {
            props.tab.mutate((doc) => {
              doc.encode.mipPolicy = e.target.value as typeof encode.mipPolicy;
            });
          }}
        >
          <option value="full-chain">Full chain</option>
          <option value="single-level">Level 0 only</option>
        </select>
      </label>
      <label>
        Alpha
        <select
          value={encode.alphaPolicy}
          onChange={(e) => {
            props.tab.mutate((doc) => {
              doc.encode.alphaPolicy = e.target.value as typeof encode.alphaPolicy;
            });
          }}
        >
          <option value="opaque-threshold">Opaque threshold</option>
          <option value="strict-alpha">Any alpha &lt; 255</option>
        </select>
      </label>
      {encode.alphaPolicy === "opaque-threshold" ? (
        <label>
          Opaque threshold
          <input
            type="number"
            min={0}
            max={255}
            value={encode.opaqueAlphaThreshold}
            onChange={(e) => {
              props.tab.mutate((doc) => {
                doc.encode.opaqueAlphaThreshold = Number(e.target.value) || 0;
              }, { history: false });
            }}
          />
        </label>
      ) : null}
      <p style={{ fontSize: 11, opacity: 0.75 }}>TPC save uses DXT1 when the composite is opaque, DXT5 when alpha is meaningful.</p>
    </div>
  );
}

function ImageTxiPanel(props: { tab: TabImageViewerState }) {
  const [theme, setTheme] = useState(() => getMonacoThemeForLanguage("txi"));
  useEffect(() => {
    const onTheme = () => setTheme(getMonacoThemeForLanguage("txi"));
    addForgeThemeChangeListener(onTheme);
    return () => removeForgeThemeChangeListener(onTheme);
  }, []);
  const issues = validateTxi(props.tab.document.txiText).map((issue) => `Line ${issue.line}: ${issue.message}`);
  const options: monacoEditor.editor.IEditorOptions = {
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: "off",
    lineNumbers: "on",
    fontSize: 12,
  };
  return (
    <div className="txi-pane">
      <div className="txi-pane__editor">
        <MonacoEditor
          width="100%"
          height="100%"
          language="txi"
          theme={theme}
          value={props.tab.document.txiText}
          options={options}
          onChange={(value) => props.tab.setTXIText(value || "", { history: false })}
        />
      </div>
      <div className="txi-pane__issues">
        {issues.slice(0, 8).map((issue, index) => (
          <div key={`txi-issue-${index}`} className="txi-pane__issue">{issue}</div>
        ))}
        {issues.length > 8 ? <div className="txi-pane__issue">...and {issues.length - 8} more</div> : null}
      </div>
    </div>
  );
}
