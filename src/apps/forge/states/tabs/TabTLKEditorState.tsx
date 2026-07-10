import React from "react";
import { TabTLKEditor } from "@/apps/forge/components/tabs/tab-tlk-editor/TabTLKEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import { searchTLKStrings, TLKSearchOptions, TLKSearchResult } from "@/managers/TLKManager";
import { TLKStringUpdate } from "@/resource/TLKObject";
import { TLKString } from "@/resource/TLKString";

interface TLKUndoSnapshot {
  FileType: string;
  FileVersion: string;
  LanguageID: number;
  StringCount: number;
  StringEntriesOffset: number;
  strings: ReturnType<TLKString["ToDB"]>[];
}

export class TabTLKEditorState extends TabState {
  tabName: string = "TLK";
  tlkObject: KotOR.TLKObject;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);

    this.setContentView(<TabTLKEditor tab={this} />);
    this.openFile();

    this.saveTypes = [
      {
        description: "Talk Table",
        accept: {
          "application/octet-stream": [".tlk"],
        },
      },
    ];
  }

  search(query: string, options: TLKSearchOptions = {}): TLKSearchResult[] {
    if (!this.tlkObject) return [];
    return searchTLKStrings(this.tlkObject.TLKStrings, query, options);
  }

  updateString(index: number, partial: TLKStringUpdate): void {
    if (!this.tlkObject) return;
    this.tlkObject.updateString(index, partial);
    this.markUnsaved();
  }

  /**
   * Add a string. When `afterIndex` is omitted, appends at the end (safest for STRREFs).
   * Otherwise inserts immediately after that index (shifts later string IDs).
   */
  addString(afterIndex?: number): number {
    if (!this.tlkObject) return -1;
    const newIndex =
      afterIndex === undefined || afterIndex < 0
        ? this.tlkObject.appendString()
        : this.tlkObject.insertStringAt(afterIndex + 1);
    this.markUnsaved();
    return newIndex;
  }

  deleteString(index: number): boolean {
    if (!this.tlkObject) return false;
    const removed = this.tlkObject.deleteStringAt(index);
    if (removed) {
      this.markUnsaved();
    }
    return removed;
  }

  private markUnsaved(): void {
    if (this.file instanceof EditorFile) {
      this.file.unsaved_changes = true;
    }
    this.editorFileUpdated();
  }

  protected captureUndoState(): TLKUndoSnapshot | undefined {
    if (!this.tlkObject) return undefined;
    return {
      FileType: this.tlkObject.FileType,
      FileVersion: this.tlkObject.FileVersion,
      LanguageID: this.tlkObject.LanguageID,
      StringCount: this.tlkObject.StringCount,
      StringEntriesOffset: this.tlkObject.StringEntriesOffset,
      strings: this.tlkObject.TLKStrings.map((s) => s.ToDB()),
    };
  }

  protected applyUndoState(state: TLKUndoSnapshot): void {
    if (!this.tlkObject || !state) return;
    this.tlkObject.FileType = state.FileType;
    this.tlkObject.FileVersion = state.FileVersion;
    this.tlkObject.LanguageID = state.LanguageID;
    this.tlkObject.StringCount = state.StringCount;
    this.tlkObject.StringEntriesOffset = state.StringEntriesOffset;
    this.tlkObject.TLKStrings = state.strings.map((row) => TLKString.FromDBObj(row));
    this.tlkObject.StringCount = this.tlkObject.TLKStrings.length;
    if (this.file instanceof EditorFile) {
      this.file.unsaved_changes = true;
    }
    this.processEventListener("onEditorFileLoad", [this]);
  }

  openFile(file?: EditorFile): Promise<KotOR.TLKObject> {
    return new Promise<KotOR.TLKObject>((resolve, reject) => {
      if (!file && this.file instanceof EditorFile) {
        file = this.file;
      }

      if (file instanceof EditorFile) {
        if (this.file != file) this.file = file;
        this.tabName = this.file.getFilename();

        file.readFile().then((response) => {
          this.tlkObject = new KotOR.TLKObject();
          this.tlkObject.loadFromBuffer(response.buffer);
          this.clearUndoHistory();
          this.processEventListener("onEditorFileLoad", [this]);
          resolve(this.tlkObject);
        }).catch(reject);
      } else {
        reject(new Error("TabTLKEditorState.openFile requires an EditorFile"));
      }
    });
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    if (!this.tlkObject) {
      return new Uint8Array(0);
    }
    // Yield so the UI can paint a busy state before large talk-table serialization.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    return this.tlkObject.toExportBuffer();
  }

  async save(): Promise<boolean> {
    const ok = await super.save();
    if (ok) {
      await this.afterSave();
    }
    return ok;
  }

  async saveAs(): Promise<boolean> {
    const ok = await super.saveAs();
    if (ok) {
      await this.afterSave();
    }
    return ok;
  }

  private afterSave(): void {
    const currentFile = this.getFile();
    if (!(currentFile instanceof EditorFile) || !this.tlkObject) return;
    const filename = currentFile.getFilename()?.toLowerCase();
    if (filename === "dialog.tlk") {
      // Keep the global talk table in sync without re-reading and reparsing the file
      // or resetting the editor UI via onEditorFileLoad.
      KotOR.TLKManager.TLKObject = this.tlkObject;
      KotOR.TLKManager.TLKStrings = this.tlkObject.TLKStrings;
    }
  }
}
