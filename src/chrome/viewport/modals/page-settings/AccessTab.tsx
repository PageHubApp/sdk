import React from "react";
import { TbPlus } from "react-icons/tb";
import { useElementPicker } from "../../../toolbar/inputs/action/useElementPicker";
import { getConnectorData } from "../../../../utils/design/variables";
import {
  ConditionGroupUI,
  defaultCondition,
} from "../../../toolbar/inputs/advanced/ConditionsInput";
import { ToolbarDashedButton } from "../../../toolbar/primitives/ToolbarDashedButton";
import {
  SettingsFormCard,
  SettingsFormField,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";
import { settingsModalSelectClass } from "../settings/settingsControlClasses";
import type { ConditionGroup } from "../../../../utils/conditions/types";

interface AccessTabProps {
  inputClass: string;
  selectClass: string;
  conditionGroups: ConditionGroup[];
  setConditionGroups: (v: ConditionGroup[]) => void;
  pageConditionFailAction: string;
  setPageConditionFailAction: (v: string) => void;
  pageConditionRedirectUrl: string;
  setPageConditionRedirectUrl: (v: string) => void;
  pageConditionFallbackPageId: string;
  setPageConditionFallbackPageId: (v: string) => void;
  /** Available pages for the "show page" fallback picker */
  pages: { id: string; name: string }[];
}

function useConnectorOptions() {
  const data = getConnectorData();
  if (!data) return [];
  return Object.entries(data).map(([provider, pdata]) => ({
    provider,
    collections: Object.keys(pdata?.bindings || {}),
  }));
}

export function AccessTab({
  inputClass,
  selectClass,
  conditionGroups: pageConditions,
  setConditionGroups: setPageConditions,
  pageConditionFailAction,
  setPageConditionFailAction,
  pageConditionRedirectUrl,
  setPageConditionRedirectUrl,
  pageConditionFallbackPageId,
  setPageConditionFallbackPageId,
  pages,
}: AccessTabProps) {
  const rawFormElements = useElementPicker("all");
  const formElements = Array.isArray(rawFormElements) ? rawFormElements : [];
  const connectorOptions = useConnectorOptions();
  const selectField = settingsModalSelectClass(selectClass);

  const groups: ConditionGroup[] = pageConditions?.length ? pageConditions : [];

  const updateGroup = (i: number, updated: ConditionGroup) => {
    const next = [...groups];
    next[i] = updated;
    setPageConditions(next);
  };

  const removeGroup = (i: number) => {
    setPageConditions(groups.filter((_, idx) => idx !== i));
  };

  const addGroup = () => {
    setPageConditions([...groups, { conditions: [defaultCondition("auth")], logic: "all" }]);
  };

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Access"
        description="Gate this page behind auth, form state, or connector rules. With no conditions, the page stays public."
      />

      <SettingsFormCard title="Conditions">
        {groups.length === 0 ? (
          <p className="text-neutral-content text-sm">
            No conditions — everyone can view this page.
          </p>
        ) : null}

        {groups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 ? (
              <div className="my-3 flex items-center gap-2">
                <div className="bg-base-300 h-px flex-1" />
                <span className="text-neutral-content text-[10px] font-bold tracking-wider uppercase">
                  Or
                </span>
                <div className="bg-base-300 h-px flex-1" />
              </div>
            ) : null}
            <ConditionGroupUI
              group={group}
              groupIndex={gi}
              onChange={updated => updateGroup(gi, updated)}
              onRemove={() => removeGroup(gi)}
              formElements={formElements}
              connectorOptions={connectorOptions}
            />
          </div>
        ))}

        <div className="pt-1">
          {groups.length === 0 ? (
            <ToolbarDashedButton onClick={addGroup}>Add condition</ToolbarDashedButton>
          ) : (
            <ToolbarDashedButton onClick={addGroup} icon={<TbPlus size={12} />}>
              Add condition group (OR)
            </ToolbarDashedButton>
          )}
        </div>
      </SettingsFormCard>

      {groups.length > 0 ? (
        <SettingsFormCard title="When access is denied">
          <SettingsFormField label="Action" htmlFor="page-condition-fail">
            <select
              id="page-condition-fail"
              value={pageConditionFailAction}
              onChange={e => setPageConditionFailAction(e.target.value)}
              className={selectField}
            >
              <option value="">Hide page content</option>
              <option value="redirect">Redirect to URL</option>
              <option value="show-page">Show another page</option>
            </select>
          </SettingsFormField>

          {pageConditionFailAction === "redirect" ? (
            <SettingsFormField label="Redirect URL" htmlFor="page-condition-redirect">
              <input
                id="page-condition-redirect"
                type="text"
                value={pageConditionRedirectUrl}
                onChange={e => setPageConditionRedirectUrl(e.target.value)}
                placeholder="/login or https://…"
                className={inputClass}
              />
            </SettingsFormField>
          ) : null}

          {pageConditionFailAction === "show-page" ? (
            <SettingsFormField label="Fallback page" htmlFor="page-condition-fallback">
              <select
                id="page-condition-fallback"
                value={pageConditionFallbackPageId}
                onChange={e => setPageConditionFallbackPageId(e.target.value)}
                className={selectField}
              >
                <option value="">Select a page…</option>
                {pages.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </SettingsFormField>
          ) : null}
        </SettingsFormCard>
      ) : null}
    </div>
  );
}
