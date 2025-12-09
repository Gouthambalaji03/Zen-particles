export type ShapeType = 'sphere' | 'heart' | 'flower' | 'saturn' | 'buddha' | 'fireworks';

export interface HandData {
  tension: number;
  isDetected: boolean;
}

export interface ParticleConfig {
  count: number;
  shape: ShapeType;
  color: string;
  tension: number;
  explosion: number;
}

export interface ControlsProps {
  shape: ShapeType;
  color: string;
  tension: number;
  onShapeChange: (shape: ShapeType) => void;
  onColorChange: (color: string) => void;
}

export interface HandTrackerProps {
  onHandData: (data: HandData) => void;
}

export interface ParticleSystemProps {
  shape: ShapeType;
  color: string;
  tension: number;
  explosion: number;
}
