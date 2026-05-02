/**
 * Local mirror of `@craftjs/utils`' `ROOT_NODE` string constant.
 *
 * Importing from `@craftjs/utils` for this single string drags the whole
 * library into the viewer bundle (~44KB). The value is the literal `"ROOT"`
 * and Craft's NodeMap layout is fixed, so there's no drift risk.
 */
export const ROOT_NODE = "ROOT";
