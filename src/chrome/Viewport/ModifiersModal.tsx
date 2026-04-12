import { ROOT_NODE, useEditor } from "@craftjs/core";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import React, { useCallback, useEffect, useState } from "react";
import { TbCheck, TbChevronDown, TbEdit, TbPlus, TbTrash } from "react-icons/tb";
import { FloatingPanel } from "../FloatingPanel";

interface Modifier {
  name: string;
  label: string;
  classes?: string;
  description?: string;
}

interface ModifiersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModifiersModal({ isOpen, onClose }: ModifiersModalProps) {
  const { actions, query } = useEditor();

  const [modifiers, setModifiers] = useState<Record<string, Modifier[]>>({});
  const [selectedType, setSelectedType] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editClasses, setEditClasses] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addType, setAddType] = useState("");

  // Load from ROOT
  useEffect(() => {
    if (isOpen) {
      try {
        const root = query.node(ROOT_NODE).get();
        const m = root?.data?.props?.modifiers || {};
        setModifiers(JSON.parse(JSON.stringify(m)));
        const types = Object.keys(m);
        if (!selectedType && types.length > 0) setSelectedType(types[0]);
      } catch (e) {
        console.error("Error loading modifiers:", e);
      }
    }
  }, [isOpen, query]);

  const currentList = modifiers[selectedType] || [];
  const componentTypes = Object.keys(modifiers).sort();

  const save = useCallback(
    (updated: Record<string, Modifier[]>) => {
      const clean: Record<string, Modifier[]> = {};
      for (const [k, v] of Object.entries(updated)) {
        if (v.length > 0) clean[k] = v;
      }
      setModifiers(clean);
      actions.setProp(ROOT_NODE, (props: any) => {
        props.modifiers = Object.keys(clean).length > 0 ? clean : undefined;
      });
    },
    [actions]
  );

  const handleDelete = (index: number) => {
    const updated = { ...modifiers };
    updated[selectedType] = currentList.filter((_, i) => i !== index);
    if (updated[selectedType].length === 0) {
      delete updated[selectedType];
      const remaining = Object.keys(updated);
      setSelectedType(remaining[0] || "");
    }
    save(updated);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditName(currentList[index].name);
    setEditLabel(currentList[index].label);
    setEditClasses(currentList[index].classes || "");
    setEditDescription(currentList[index].description || "");
    setIsAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editName.trim() || !editLabel.trim()) return;
    const updated = { ...modifiers };
    const list = [...currentList];
    if (editingIndex !== null) {
      const entry: Modifier = { name: editName.trim(), label: editLabel.trim() };
      if (editClasses.trim()) entry.classes = editClasses.trim();
      if (editDescription.trim()) entry.description = editDescription.trim();
      list[editingIndex] = entry;
    }
    updated[selectedType] = list;
    save(updated);
    setEditingIndex(null);
    setEditName("");
    setEditLabel("");
    setEditClasses("");
    setEditDescription("");
  };

  const handleAdd = () => {
    const typeName = addType.trim();
    if (!editName.trim() || !editLabel.trim() || !typeName) return;
    const name = editName.trim().toLowerCase().replace(/\s+/g, "-");
    const updated = { ...modifiers };
    if (!updated[typeName]) updated[typeName] = [];
    if (updated[typeName].some(m => m.name === name)) return;
    const entry: Modifier = { name, label: editLabel.trim() };
    if (editClasses.trim()) entry.classes = editClasses.trim();
    if (editDescription.trim()) entry.description = editDescription.trim();
    updated[typeName].push(entry);
    save(updated);
    setSelectedType(typeName);
    setIsAdding(false);
    setEditName("");
    setEditLabel("");
    setEditClasses("");
    setEditDescription("");
    setAddType("");
  };

  const startAdding = () => {
    setIsAdding(true);
    setEditingIndex(null);
    setEditName("");
    setEditLabel("");
    setEditClasses("");
    setEditDescription("");
    setAddType(selectedType);
  };

  const inputClass =
    "w-full rounded-lg border border-base-300 bg-input px-3 py-2 text-sm text-base-content placeholder:text-neutral-content focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Modifiers"
      backdrop
      storageKey="modifiers-manager"
      defaultWidth={500}
      defaultHeight={Math.round(typeof window !== "undefined" ? window.innerHeight - 120 : 600)}
      minWidth={360}
      maxWidth={700}
      minHeight={300}
      edges={["e", "s", "se", "w", "sw"]}
    >
      <div className="flex h-full flex-col">
        {/* Type filter */}
        {componentTypes.length > 0 && !isAdding && (
          <div className="border-base-300 bg-neutral border-b px-4 py-2">
            <Listbox
              value={selectedType}
              onChange={v => {
                setSelectedType(v);
                setEditingIndex(null);
              }}
            >
              <div className="relative">
                <ListboxButton className="border-base-300 bg-input text-base-content focus:ring-ring flex w-full items-center justify-between rounded-lg border px-4 py-2 text-left text-sm focus:ring-2 focus:outline-none">
                  <span>{selectedType || "Select type"}</span>
                  <TbChevronDown className="text-neutral-content" />
                </ListboxButton>
                <ListboxOptions
                  anchor="bottom start"
                  className="pagehub-sdk-root ph-select-content"
                  modal={false}
                >
                  {componentTypes.map(t => (
                    <ListboxOption key={t} value={t} className="ph-select-item">
                      {({ selected }) => (
                        <div className="flex items-center gap-2">
                          <span className="flex w-4 shrink-0 items-center justify-center">
                            {selected && <TbCheck size={14} />}
                          </span>
                          {t}
                          <span className="text-neutral-content ml-auto text-xs">
                            {modifiers[t]?.length || 0}
                          </span>
                        </div>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>
          </div>
        )}

        {/* Content */}
        <div className="scrollbar-light bg-base-100 flex-1 overflow-y-auto p-4">
          {/* Add modifier form */}
          {isAdding && (
            <div className="border-base-300 bg-neutral/50 space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">New Modifier</p>
              <div>
                <label className="text-neutral-content mb-1 block text-xs font-medium">
                  Component Type
                </label>
                <input
                  type="text"
                  value={addType}
                  onChange={e => setAddType(e.target.value)}
                  placeholder="e.g. Button, Container"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-neutral-content mb-1 block text-xs font-medium">Label</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  placeholder="e.g. Outline, Rounded"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-neutral-content mb-1 block text-xs font-medium">
                  Modifier Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. section-wrapper"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-neutral-content mb-1 block text-xs font-medium">
                  Classes (optional — for composite modifiers)
                </label>
                <textarea
                  value={editClasses}
                  onChange={e => setEditClasses(e.target.value)}
                  placeholder="e.g. flex flex-col gap-space-md w-full"
                  className={`${inputClass} min-h-[3rem] resize-y`}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-neutral-content mb-1 block text-xs font-medium">
                  Description (optional — shown as help text in the editor)
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="e.g. Adds an outline border, removes fill"
                  className={inputClass}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} className="btn btn-primary flex-1">
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setEditName("");
                    setEditLabel("");
                    setEditClasses("");
                    setEditDescription("");
                    setAddType("");
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Modifier list */}
          {!isAdding && (
            <>
              {componentTypes.length === 0 && (
                <p className="text-neutral-content text-center text-sm">
                  No modifiers yet. Click &quot;Add Modifier&quot; to create one.
                </p>
              )}

              {selectedType && currentList.length === 0 && (
                <p className="text-neutral-content text-center text-sm">
                  No modifiers for {selectedType}.
                </p>
              )}

              <div className="space-y-1">
                {currentList.map((mod, i) => (
                  <div key={i}>
                    {editingIndex === i ? (
                      <div className="border-base-300 bg-neutral/50 space-y-2 rounded-lg border p-3">
                        <div>
                          <label className="text-neutral-content mb-1 block text-xs font-medium">
                            Label
                          </label>
                          <input
                            value={editLabel}
                            onChange={e => setEditLabel(e.target.value)}
                            className={inputClass}
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="text-neutral-content mb-1 block text-xs font-medium">
                            Modifier Name
                          </label>
                          <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className={inputClass}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleSaveEdit();
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-neutral-content mb-1 block text-xs font-medium">
                            Classes (composite)
                          </label>
                          <textarea
                            value={editClasses}
                            onChange={e => setEditClasses(e.target.value)}
                            className={`${inputClass} min-h-[3rem] resize-y`}
                            rows={2}
                            placeholder="e.g. flex flex-col gap-space-md w-full"
                          />
                        </div>
                        <div>
                          <label className="text-neutral-content mb-1 block text-xs font-medium">
                            Description (optional)
                          </label>
                          <input
                            type="text"
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            className={inputClass}
                            placeholder="e.g. Adds an outline border, removes fill"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} className="btn btn-primary flex-1">
                            Save
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="btn btn-secondary flex-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="hover:bg-neutral flex items-center gap-2 rounded-lg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div>
                            <span className="text-sm font-medium">{mod.label}</span>
                            <span className="text-neutral-content ml-2 text-xs">.{mod.name}</span>
                            {mod.classes && (
                              <span className="text-neutral-content/60 ml-1 text-[9px]">
                                ×{mod.classes.split(/\s+/).filter(Boolean).length}
                              </span>
                            )}
                          </div>
                          {mod.description && (
                            <p className="text-neutral-content/70 truncate text-[10px]">
                              {mod.description}
                            </p>
                          )}
                          {mod.classes && (
                            <p className="text-neutral-content/50 truncate text-[10px]">
                              {mod.classes}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleEdit(i)}
                          className="text-neutral-content hover:text-base-content"
                          title="Edit"
                        >
                          <TbEdit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(i)}
                          className="text-neutral-content hover:text-error"
                          title="Delete"
                        >
                          <TbTrash size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-base-300 bg-neutral flex gap-3 border-t p-4">
          {!isAdding && (
            <button
              type="button"
              onClick={startAdding}
              className="btn btn-primary flex flex-1 items-center justify-center gap-1"
            >
              <TbPlus size={14} />
              Add Modifier
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Done
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}
