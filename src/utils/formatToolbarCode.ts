export type ToolbarFormatLanguage = "html" | "css" | "javascript" | "js";

/**
 * Prettier via dynamic import so the editor chunk stays small until first format.
 */
export async function formatToolbarCode(
  source: string,
  language: ToolbarFormatLanguage
): Promise<string> {
  const trimmed = source.trim();
  if (!trimmed) return source;

  const prettier = await import("prettier/standalone");

  if (language === "html") {
    const html = await import("prettier/plugins/html");
    const plugins = [html];
    const out = await prettier.format(source, {
      parser: "html",
      plugins,
      printWidth: 100,
      tabWidth: 2,
      htmlWhitespaceSensitivity: "ignore",
    });
    return out.replace(/\s+$/, "");
  }

  if (language === "css") {
    const postcss = await import("prettier/plugins/postcss");
    const out = await prettier.format(source, {
      parser: "css",
      plugins: [postcss],
      printWidth: 100,
      tabWidth: 2,
    });
    return out.replace(/\s+$/, "");
  }

  const babel = await import("prettier/plugins/babel");
  const estree = await import("prettier/plugins/estree");
  const out = await prettier.format(source, {
    parser: "babel",
    plugins: [babel, estree],
    printWidth: 100,
    tabWidth: 2,
  });
  return out.replace(/\s+$/, "");
}
