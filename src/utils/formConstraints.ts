/**
 * Native validation attributes for a form field — `pattern` on text-like inputs,
 * `min` / `max` / `step` on numeric and date inputs. Shared by the React
 * FormElement and its static `toHTML`, so a static-publish form validates the
 * same way as the React-rendered one.
 *
 * Only attributes with a value are returned: the props default to `""`, and an
 * empty `pattern=""` would reject every non-empty entry.
 */
const PATTERN_TYPES = new Set(["text", "search", "url", "tel", "email", "password"]);
const RANGE_TYPES = new Set(["number", "range", "date", "datetime-local", "time", "month", "week"]);

export interface FormConstraintAttrs {
  pattern?: string;
  min?: string;
  max?: string;
  step?: string;
}

export function formConstraintAttrs(props: {
  type?: string;
  pattern?: string;
  min?: string;
  max?: string;
  step?: string;
}): FormConstraintAttrs {
  const out: FormConstraintAttrs = {};
  const type = props.type || "text";
  if (PATTERN_TYPES.has(type) && props.pattern) out.pattern = props.pattern;
  if (RANGE_TYPES.has(type)) {
    if (props.min) out.min = props.min;
    if (props.max) out.max = props.max;
    if (props.step) out.step = props.step;
  }
  return out;
}
