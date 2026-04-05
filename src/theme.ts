/**
 * @pagehub/sdk — Theme injection utility
 *
 * Injects CSS custom properties into the SDK container
 * based on the customer's theme configuration.
 */

import type { PageHubTheme } from "./types";

const STYLE_ID = "pagehub-sdk-theme";

export function injectTheme(
  container: HTMLElement,
  theme: Required<PageHubTheme>
): void {
  // Remove existing theme style
  const existing = container.querySelector(`#${STYLE_ID}`);
  if (existing) existing.remove();

  const vars: string[] = [];

  if (theme.primaryColor) vars.push(`--primary: ${theme.primaryColor}`);
  if (theme.secondaryColor) vars.push(`--secondary: ${theme.secondaryColor}`);
  if (theme.accentColor) vars.push(`--accent: ${theme.accentColor}`);

  // Customer-supplied CSS variables
  if (theme.cssVariables) {
    for (const [key, value] of Object.entries(theme.cssVariables)) {
      const varName = key.startsWith("--") ? key : `--${key}`;
      vars.push(`${varName}: ${value}`);
    }
  }

  const css = `
    :host, .pagehub-sdk-root {
      ${vars.join(";\n      ")};
    }
    ${theme.customCSS || ""}
  `;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  container.appendChild(style);

  // Colour scheme
  if (theme.colorScheme && theme.colorScheme !== "system") {
    container.setAttribute("data-color-scheme", theme.colorScheme);
  }
}

export function removeTheme(container: HTMLElement): void {
  const existing = container.querySelector(`#${STYLE_ID}`);
  if (existing) existing.remove();
  container.removeAttribute("data-color-scheme");
}
