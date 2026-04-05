module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Strip @layer wrappers so SDK utilities have normal specificity
    // (layered styles always lose to unlayered styles, breaking standalone use)
    "./postcss-unwrap-layers.cjs": {},
  },
};
