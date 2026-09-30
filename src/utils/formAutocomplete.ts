/**
 * The `autocomplete` token for a form field (WCAG 1.3.5). Shared by the React
 * FormElement and its static `toHTML`, so both renderers tell browsers — and
 * AI agents filling the form — the same thing about each field.
 *
 * An explicit `autoComplete` prop wins; otherwise it's inferred from the
 * field's `name`, then its `type`. Returns undefined when nothing fits.
 */
const AUTOCOMPLETE_BY_NAME: Record<string, string> = {
  email: "email",
  name: "name",
  "full-name": "name",
  fullname: "name",
  "first-name": "given-name",
  firstname: "given-name",
  "given-name": "given-name",
  "last-name": "family-name",
  lastname: "family-name",
  "family-name": "family-name",
  phone: "tel",
  tel: "tel",
  telephone: "tel",
  address: "street-address",
  street: "street-address",
  city: "address-level2",
  state: "address-level1",
  zip: "postal-code",
  zipcode: "postal-code",
  "postal-code": "postal-code",
  country: "country-name",
  company: "organization",
  organization: "organization",
  org: "organization",
};

const AUTOCOMPLETE_BY_TYPE: Record<string, string> = {
  email: "email",
  tel: "tel",
  url: "url",
};

export function formAutocomplete(props: {
  autoComplete?: string;
  name?: string;
  type?: string;
}): string | undefined {
  if (props.autoComplete) return props.autoComplete;
  return (
    AUTOCOMPLETE_BY_NAME[(props.name || "").toLowerCase()] ||
    AUTOCOMPLETE_BY_TYPE[props.type || ""] ||
    undefined
  );
}
