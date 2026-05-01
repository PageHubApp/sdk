/** Fallback width before the menu node is measured (matches min-w ~12rem). */
export const MENU_W = 220;

/** Same interaction as `.ph-select-item` (dropdowns.css): accent fill reads on base-100 menus. */
export const CTX_MENU_HOVER =
  "outline-none transition-[color,background-color] duration-150 ease-out hover:bg-accent hover:text-accent-content focus-visible:bg-accent focus-visible:text-accent-content active:bg-accent/90";

export const CTX_MENU_ITEM = `flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${CTX_MENU_HOVER}`;

export const CTX_MENU_SUBMENU_TRIGGER = `flex w-full cursor-default select-none items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm ${CTX_MENU_HOVER}`;
