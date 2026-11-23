export interface LoadedImage {
  /** Canvas source of resized image */
  source: HTMLCanvasElement;
  width: number;
  height: number;
  aspect: number; // width / height
  /** Alpha ImageData for grab testing */
  alpha: ImageData;
}

export type Mode = 'empty' | 'paint' | 'play';
export type RecFormat = 'video' | 'gif';
export type BrushType = 'hard' | 'soft';
