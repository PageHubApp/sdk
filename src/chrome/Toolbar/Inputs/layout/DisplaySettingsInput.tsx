// @ts-nocheck
import { ClassNameInput } from "../advanced/ClassNameInput";
import { DisplayInput } from "./DisplayInput";

export default function DisplaySettingsInput({ showCursor = true }: { showCursor?: boolean }) {
  return (
    <>
      <DisplayInput showCursor={showCursor} />
      <ClassNameInput />
    </>
  );
}

