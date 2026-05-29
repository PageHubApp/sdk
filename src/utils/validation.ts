import { sdkLog } from "./logger";
export const isCssValid = (code: string): boolean => {
  try {
    const { parse } = require("css-tree");
    parse(code);
    return true;
  } catch {
    return false;
  }
};

export const isJsValid = (code: string): boolean => {
  const strippedCode = code.replace(/<script[^>]*>|<\/script>/gi, "");
  try {
    new Function(strippedCode);
    return true;
  } catch (err) {
    sdkLog.error(err);
    return false;
  }
};
