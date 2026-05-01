/** DOM-querying helpers that need `window` / `document`. */

export const getStyleSheets = (): string[] => {
  if (typeof window === "undefined") return [];
  const links = document.getElementsByTagName("link") || [];
  const filtered: string[] = [];
  let i = links.length;
  while (i--) {
    if (links[i].rel === "stylesheet") filtered.push(links[i].href);
  }
  return filtered;
};

export const popupCenter = (url: string, title: string) => {
  const windowLeft = window.screenLeft ?? window.screenX ?? 0;
  const windowTop = window.screenTop ?? window.screenY ?? 0;
  const windowWidth = window.outerWidth || window.innerWidth || window.screen.availWidth;
  const windowHeight = window.outerHeight || window.innerHeight || window.screen.availHeight;
  const popupWidth = 400;
  const popupHeight = 600;
  const left = Math.round(windowLeft + (windowWidth - popupWidth) / 2);
  const top = Math.round(windowTop + (windowHeight - popupHeight) / 2);

  const newWindow = window.open(
    url,
    title,
    `width=${popupWidth},height=${popupHeight},top=${top},left=${left},scrollbars=no,resizable=no,toolbar=no,menubar=no,location=no,status=no`
  );
  newWindow?.focus();
};
