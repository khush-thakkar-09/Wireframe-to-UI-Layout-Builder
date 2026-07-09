export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RawDetection {
  bbox: [number, number, number, number]; // [x, y, w, h] format
  class: string;
  confidence: number;
}

export interface ProcessedDetection {
  boundingBox: BoundingBox;
  detrClass: string;
  detrConfidence: number;
}
