/**
 * useStyleGuideTokens — CRUD writers for `theme.styleGuide` + the new
 * `theme.styleGuideMeta` sidecar. Used by the VarPicker token editor.
 *
 * `theme.styleGuide` is a flat `Record<string,string>`; built-in keys are
 * listed in `STYLE_TOKEN_REGISTRY`. Anything not in the registry is treated
 * as a user-created (custom) token. Per-token metadata (custom flag,
 * applies-to override) lives in the optional `theme.styleGuideMeta` sidecar.
 */
import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useCallback } from "react";
import { STYLE_TOKEN_REGISTRY, StyleTokenCategory } from "../styleTokenRegistry";

export interface StyleGuideMetaEntry {
  appliesTo?: StyleTokenCategory[];
  custom?: boolean;
}

export type StyleGuideMeta = Record<string, StyleGuideMetaEntry>;

export interface UpsertTokenInput {
  /** Stable key in `theme.styleGuide` (e.g. `heroGap`). camelCase preferred —
   *  emitted as `--hero-gap`. */
  key: string;
  /** CSS-ready value string. */
  value: string;
  /** Sidecar metadata (omit for built-in keys; required for custom). */
  meta?: StyleGuideMetaEntry;
}

export interface RenameTokenInput {
  oldKey: string;
  newKey: string;
}

export function useStyleGuideTokens() {
  const { actions } = useEditor();

  /** Write `theme.styleGuide[key] = value` and (optionally) merge meta. */
  const upsertToken = useCallback(
    ({ key, value, meta }: UpsertTokenInput) => {
      actions.setProp(ROOT_NODE, (props: any) => {
        if (!props.theme) props.theme = {};
        if (!props.theme.styleGuide) props.theme.styleGuide = {};
        props.theme.styleGuide[key] = value;
        if (meta) {
          if (!props.theme.styleGuideMeta) props.theme.styleGuideMeta = {};
          props.theme.styleGuideMeta[key] = {
            ...(props.theme.styleGuideMeta[key] || {}),
            ...meta,
          };
        }
      });
    },
    [actions]
  );

  /** Delete a token. Only allowed for custom keys (registry keys are
   *  required by the design system and silently ignored). */
  const deleteToken = useCallback(
    (key: string) => {
      if (STYLE_TOKEN_REGISTRY[key]) return; // built-in, refuse
      actions.setProp(ROOT_NODE, (props: any) => {
        if (props.theme?.styleGuide) {
          delete props.theme.styleGuide[key];
        }
        if (props.theme?.styleGuideMeta) {
          delete props.theme.styleGuideMeta[key];
        }
      });
    },
    [actions]
  );

  /** Rename a custom token in-place: copies value + meta, removes the old
   *  entry. Caller is responsible for blocking when refs to the old var
   *  exist (use `useTokenUsage`). Built-in keys can't be renamed. */
  const renameToken = useCallback(
    ({ oldKey, newKey }: RenameTokenInput) => {
      if (STYLE_TOKEN_REGISTRY[oldKey]) return;
      if (oldKey === newKey) return;
      actions.setProp(ROOT_NODE, (props: any) => {
        const sg = props.theme?.styleGuide;
        const meta = props.theme?.styleGuideMeta;
        if (!sg || !(oldKey in sg)) return;
        sg[newKey] = sg[oldKey];
        delete sg[oldKey];
        if (meta && oldKey in meta) {
          meta[newKey] = meta[oldKey];
          delete meta[oldKey];
        }
      });
    },
    [actions]
  );

  return { upsertToken, deleteToken, renameToken };
}
