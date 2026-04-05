/** Unwrap all @layer rules so every declaration has normal (unlayered) specificity. */
module.exports = () => ({
  postcssPlugin: "postcss-unwrap-layers",
  AtRule: {
    layer(atRule) {
      atRule.replaceWith(atRule.nodes || []);
    },
  },
});
module.exports.postcss = true;
