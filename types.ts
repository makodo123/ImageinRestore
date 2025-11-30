export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export enum EditorMode {
  UPLOAD = 'UPLOAD',
  MASKING = 'MASKING',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
}

export interface RestoreRequest {
  imageBase64: string;
  maskBase64: string;
  prompt?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}
