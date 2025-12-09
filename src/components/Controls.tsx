import { Heart, Flower, Disc, User, Sparkles, Circle } from 'lucide-react';
import { ControlsProps, ShapeType } from '../types';

const shapes: { type: ShapeType; icon: React.ComponentType<any>; label: string }[] = [
  { type: 'heart', icon: Heart, label: 'Heart' },
  { type: 'flower', icon: Flower, label: 'Flower' },
  { type: 'saturn', icon: Disc, label: 'Saturn' },
  { type: 'buddha', icon: User, label: 'Buddha' },
  { type: 'fireworks', icon: Sparkles, label: 'Fireworks' },
  { type: 'sphere', icon: Circle, label: 'Sphere' },
];

const colors = [
  { name: 'Cyan', value: '#00ffff' },
  { name: 'Magenta', value: '#ff00ff' },
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Green', value: '#00ff00' },
  { name: 'Orange', value: '#ff6600' },
  { name: 'Purple', value: '#9933ff' },
  { name: 'Pink', value: '#ff69b4' },
  { name: 'Blue', value: '#0099ff' },
];

const Controls = ({ shape, color, tension, onShapeChange, onColorChange }: ControlsProps) => {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
        {/* Shape Selector */}
        <div className="mb-6">
          <h3 className="text-white/60 text-xs font-medium mb-3 text-center uppercase tracking-wider">
            Shape
          </h3>
          <div className="flex gap-3">
            {shapes.map((s) => {
              const Icon = s.icon;
              const isSelected = shape === s.type;
              return (
                <button
                  key={s.type}
                  onClick={() => onShapeChange(s.type)}
                  className={`
                    relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl
                    transition-all duration-300 group
                    ${
                      isSelected
                        ? 'bg-white/20 shadow-lg shadow-white/30'
                        : 'bg-white/5 hover:bg-white/10'
                    }
                  `}
                  title={s.label}
                >
                  <Icon
                    className={`
                      w-6 h-6 transition-all duration-300
                      ${isSelected ? 'text-white scale-110' : 'text-white/60 group-hover:text-white/80'}
                    `}
                  />
                  <span
                    className={`
                      text-[10px] transition-all duration-300
                      ${isSelected ? 'text-white font-medium' : 'text-white/50'}
                    `}
                  >
                    {s.label}
                  </span>
                  {isSelected && (
                    <div className="absolute inset-0 rounded-xl animate-pulse bg-white/10" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Picker */}
        <div className="mb-6">
          <h3 className="text-white/60 text-xs font-medium mb-3 text-center uppercase tracking-wider">
            Color
          </h3>
          <div className="flex gap-2 justify-center">
            {colors.map((c) => {
              const isSelected = color === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => onColorChange(c.value)}
                  className={`
                    relative w-8 h-8 rounded-full transition-all duration-300
                    ${isSelected ? 'scale-125 shadow-lg' : 'hover:scale-110'}
                  `}
                  style={{
                    backgroundColor: c.value,
                    boxShadow: isSelected ? `0 0 20px ${c.value}80` : 'none',
                  }}
                  title={c.name}
                >
                  {isSelected && (
                    <div
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{ backgroundColor: c.value, opacity: 0.5 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tension Status Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider">
              Hand Tension
            </h3>
            <span className="text-white/80 text-xs font-mono">
              {Math.round(tension * 100)}%
            </span>
          </div>
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-300 rounded-full"
              style={{ width: `${tension * 100}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse" />
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-white/40 text-[10px]">Open</span>
            <span className="text-white/40 text-[10px]">Closed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;
