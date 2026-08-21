/** One shared palette for both the on-chart legend's swatch dots and the
 *  real series colors LWC actually renders -- these used to be two
 *  independent things (the legend cycled colors for decoration only, every
 *  Pine line series rendered in LWC's default blue regardless), so two
 *  different single-line indicators like SMA and EMA were indistinguishable
 *  on the chart despite showing different colors in the legend. */
export const INDICATOR_COLORS = ["#6c5ce7", "#16c784", "#f0b90b", "#0ea5e9", "#f0525d", "#a855f7"];
