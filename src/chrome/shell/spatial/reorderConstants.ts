/**
 * Main-axis nearest-child before/after zone fractions (see nearestChildReorderWhere).
 * Wider leading band when only one in-flow sibling so before/after is easier to hit.
 */

/** Default: first 30% of the child along main axis counts as "before". */
export const NEAREST_REORDER_BEFORE_FRACTION_DEFAULT = 0.3;

/** Single in-flow child: widen toward ~45% so the split feels less lopsided. */
export const NEAREST_REORDER_BEFORE_FRACTION_SINGLE_CHILD = 0.42;
