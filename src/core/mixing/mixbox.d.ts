declare module 'mixbox' {
  const mixbox: {
    LATENT_SIZE: number;
    /** Components in [0, 1], gamma-encoded sRGB. */
    floatRgbToLatent(r: number, g: number, b: number): number[];
    latentToFloatRgb(latent: number[]): [number, number, number];
  };
  export default mixbox;
}
