// Precision reduction only. mergePaths/cleanupIds stay off on purpose: the hero
// map's 161 paths are the Chad regions, and the scroll treatment for it is not
// settled yet — merging them would make per-region animation impossible later.
export default {
  multipass: true,
  floatPrecision: 1,
  plugins: [
    { name: 'preset-default', params: { overrides: { mergePaths: false, cleanupIds: false, removeViewBox: false } } },
  ],
};
