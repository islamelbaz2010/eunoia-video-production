export interface VideoResolution {
  readonly width: number;
  readonly height: number;
}

export function meetsMinimumResolution(r: VideoResolution): boolean {
  return r.width >= 1280 && r.height >= 720;
}
