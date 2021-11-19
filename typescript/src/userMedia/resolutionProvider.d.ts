export interface Ioption {
  resolutionSelectionStrategy: string; 
  aspectRatio: string; 
  resolution: string; 
  frameRate: number; 
};

export declare const Icollection: {
  '9x16': ({ 3840: number; 1920?: number; 1366?: number; 1280?: number; 1024?: number; 854?: number; 640?: number; 320?: number; } | { 1920: number; 3840?: number; 1366?: number; 1280?: number; 1024?: number; 854?: number; 640?: number; 320?: number; } | { 1366: number; 3840?: number; 1920?: number; 1280?: number; 1024?: number; 854?: number; 640?: number; 320?: number; } | { 1280: number; 3840?: number; 1920?: number; 1366?: number; 1024?: number; 854?: number; 640?: number; 320?: number; } | { 1024: number; 3840?: number; 1920?: number; 1366?: number; 1280?: number; 854?: number; 640?: number; 320?: number; } | { 854: number; 3840?: number; 1920?: number; 1366?: number; 1280?: number; 1024?: number; 640?: number; 320?: number; } | { 640: number; 3840?: number; 1920?: number; 1366?: number; 1280?: number; 1024?: number; 854?: number; 320?: number; } | {
      320: number; 3840?: number; 1920?: number; 1366? // 720p(HD)
          : number; 1280?: number; 1024?: number; 854?: number; 640?: number;
  })[]; '3x4'?: string; '16x9'?: string; '4x3'?: string;
} | {
  '3x4': ({ 1600: number; 1440?: number; 960?: number; 800?: number; 768?: number; 640?: number; 480?: number; 352?: number; 320?: number; 176?: number; 160?: number; } | {
      1440: number; 1600?: number; 960?: number; 800?: number; 768?: number; 640?: number; 480?: number // CIF
          ; 352?: number; 320?: number; 176?: number; 160?: number;
  } | { 960: number; 1600?: number; 1440?: number; 800?: number; 768?: number; 640?: number; 480?: number; 352?: number; 320?: number; 176?: number; 160?: number; } | {
      800: number; 1600?: number; 1440?: number; 960?: number // 720p(HD)
          ; 768?: number; 640?: number; 480?: number; 352?: number; 320?: number; 176?: number; 160? // 360p (nHD)
      : number;
  } | {
      768: number; 1600?: number; 1440?: number; 960?: number; 800?: number; 640?: number; 480?: number // UXGA
          ; 352?: number; 320?: number; 176?: number; 160?: number;
  } | {
      640: number; 1600?: number; 1440?: number; 960?: number; 800?: number; 768 // VGA
          ? // VGA
          : number; 480?: number; 352?: number; 320?: number; 176?: number; 160?: number;
  } | {
      480: number; 1600?: number; 1440?: number; 960?: number; 800 // QQVGA
          ? // QQVGA
          : number; 768?: number; 640?: number; 352?: number; 320?: number; 176?: number; 160?: number;
  } | { 352: number; 1600?: number; 1440?: number; 960?: number; 800?: number; 768?: number; 640?: number; 480?: number; 320?: number; 176?: number; 160?: number; } | { 320: number; 1600?: number; 1440?: number; 960?: number; 800?: number; 768?: number; 640?: number; 480?: number; 352?: number; 176?: number; 160?: number; } | { 176: number; 1600?: number; 1440?: number; 960?: number; 800?: number; 768?: number; 640?: number; 480?: number; 352?: number; 320?: number; 160?: number; } | { 160: number; 1600?: number; 1440?: number; 960?: number; 800?: number; 768?: number; 640?: number; 480?: number; 352?: number; 320?: number; 176?: number; })[]; '9x16'?: string; '16x9'?: string; '4x3'?: string;
} | {
  '16x9': ({ 2160: number; 1080?: number; 768?: number; 720?: number; 576?: number; 480?: number; 360?: number; 180?: number; } | { 1080: number; 2160?: number; 768?: number; 720?: number; 576?: number; 480?: number; 360?: number; 180?: number; } | { 768: number; 2160?: number; 1080?: number; 720?: number; 576?: number; 480?: number; 360?: number; 180?: number; } | { 720: number; 2160?: number; 1080?: number; 768?: number; 576?: number; 480?: number; 360?: number; 180?: number; } | { 576: number; 2160?: number; 1080?: number; 768?: number; 720?: number; 480?: number; 360?: number; 180?: number; } | { 480: number; 2160?: number; 1080?: number; 768?: number; 720?: number; 576?: number; 360?: number; 180?: number; } | {
      360: number; 2160?: number; 1080?: number; 768?: number; 720?: number; 576?: number; 480?: number // Portrait
          ; 180?: number;
  } | { 180: number; 2160?: number; 1080?: number; 768?: number; 720?: number; 576?: number; 480?: number; 360?: number; })[]; '9x16'?: string; '3x4'?: string; '4x3'?: string;
} | {
  '4x3': ({
      1200: number; 1080?: number; 720?: number; 600?: number // Landscape
          ; 576?: number; 480?: number; 360?: number; 288?: number; 240?: number; 144?: number; 120?: number;
  } | { 1080: number; 1200?: number; 720?: number; 600?: number; 576?: number; 480?: number; 360?: number; 288?: number; 240?: number; 144?: number; 120?: number; } | { 720: number; 1200?: number; 1080?: number; 600?: number; 576?: number; 480?: number; 360?: number; 288?: number; 240?: number; 144?: number; 120?: number; } | { 600: number; 1200?: number; 1080?: number; 720?: number; 576?: number; 480?: number; 360?: number; 288?: number; 240?: number; 144?: number; 120?: number; } | { 576: number; 1200?: number; 1080?: number; 720?: number; 600?: number; 480?: number; 360?: number; 288?: number; 240?: number; 144?: number; 120?: number; } | { 480: number; 1200?: number; 1080?: number; 720?: number; 600?: number; 576?: number; 360?: number; 288?: number; 240?: number; 144?: number; 120?: number; } | { 360: number; 1200?: number; 1080?: number; 720?: number; 600?: number; 576?: number; 480?: number; 288?: number; 240?: number; 144?: number; 120?: number; } | { 288: number; 1200?: number; 1080?: number; 720?: number; 600?: number; 576?: number; 480?: number; 360?: number; 240?: number; 144?: number; 120?: number; } | { 240: number; 1200?: number; 1080?: number; 720?: number; 600?: number; 576?: number; 480?: number; 360?: number; 288?: number; 144?: number; 120?: number; } | { 144: number; 1200?: number; 1080?: number; 720?: number; 600?: number; 576?: number; 480?: number; 360?: number; 288?: number; 240?: number; 120?: number; } | { 120: number; 1200?: number; 1080?: number; 720?: number; 600?: number; 576?: number; 480?: number; 360?: number; 288?: number; 240?: number; 144?: number; })[]; '9x16'?: string; '3x4'?: string; '16x9'?: string;
}