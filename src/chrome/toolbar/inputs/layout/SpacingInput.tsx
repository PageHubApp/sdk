import LayoutInput from "./LayoutInput";

export const SpacingInput = () => <LayoutInput mode="spacing" hidePresets={true} />;

/** Search-only: same Alignment block as full LayoutInput (flex/grid gap, align, justify). */
export const AlignmentInput = () => <LayoutInput mode="alignment" hidePresets={true} />;
