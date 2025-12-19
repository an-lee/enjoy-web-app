declare module 'essentia.js' {
  export const EssentiaWASM: unknown

  // Essentia.js exports a constructor that takes the WASM backend.
  export class Essentia {
    constructor(wasm: unknown)
    version: string
    arrayToVector(arr: Float32Array): any
    vectorToArray(vec: any): number[]
    PitchYinProbabilistic(
      input: any,
      frameSize?: number,
      hopSize?: number,
      lowRMSThreshold?: number,
      outputUnvoiced?: 'zero' | 'nan',
      preciseTime?: boolean,
      sampleRate?: number
    ): { pitch: any; voicedProbabilities: any }
  }
}

declare module 'essentia.js/dist/essentia-wasm.es.js' {
  export const EssentiaWASM: unknown
}

declare module 'essentia.js/dist/essentia.js-core.es.js' {
  const Essentia: new (wasm: unknown, isDebug?: boolean) => {
    version: string
    arrayToVector(arr: Float32Array): any
    vectorToArray(vec: any): number[]
    PitchYinProbabilistic(
      input: any,
      frameSize?: number,
      hopSize?: number,
      lowRMSThreshold?: number,
      outputUnvoiced?: 'zero' | 'nan',
      preciseTime?: boolean,
      sampleRate?: number
    ): { pitch: any; voicedProbabilities: any }
  }
  export default Essentia
}


