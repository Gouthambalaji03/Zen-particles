import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { HandTrackerProps } from '../types';
import { VideoOff, RefreshCw } from 'lucide-react';

const HandTracker = ({ onHandData }: HandTrackerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const animationFrameRef = useRef<number>();
  const lastTensionRef = useRef<number>(0);

  const calculateTension = (result: HandLandmarkerResult): number => {
    if (!result.landmarks || result.landmarks.length === 0) {
      return 0;
    }

    const landmarks = result.landmarks[0];

    // Wrist is landmark 0
    const wrist = landmarks[0];

    // Finger tips: thumb(4), index(8), middle(12), ring(16), pinky(20)
    const fingerTips = [
      landmarks[4],  // Thumb
      landmarks[8],  // Index
      landmarks[12], // Middle
      landmarks[16], // Ring
      landmarks[20], // Pinky
    ];

    // Calculate palm size (distance from wrist to middle finger base)
    const middleBase = landmarks[9];
    const palmSize = Math.sqrt(
      Math.pow(middleBase.x - wrist.x, 2) +
      Math.pow(middleBase.y - wrist.y, 2) +
      Math.pow(middleBase.z - wrist.z, 2)
    );

    // Calculate average distance from fingertips to wrist
    let totalDistance = 0;
    fingerTips.forEach((tip) => {
      const distance = Math.sqrt(
        Math.pow(tip.x - wrist.x, 2) +
        Math.pow(tip.y - wrist.y, 2) +
        Math.pow(tip.z - wrist.z, 2)
      );
      totalDistance += distance;
    });

    const avgDistance = totalDistance / fingerTips.length;

    // Normalize: closed fist = ~0.5 * palmSize, open hand = ~2.0 * palmSize
    // Map to 0.0 (open) to 1.0 (closed)
    const normalized = 1 - Math.max(0, Math.min(1, (avgDistance - palmSize * 0.5) / (palmSize * 1.5)));

    return normalized;
  };

  const initializeHandLandmarker = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
      );

      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        numHands: 1,
        runningMode: 'VIDEO',
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      setHandLandmarker(landmarker);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize HandLandmarker:', err);
      setError('Failed to initialize hand tracking');
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      setError('Camera access denied. Please allow camera permissions and retry.');
    }
  };

  const detectHands = async () => {
    if (!videoRef.current || !handLandmarker || videoRef.current.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
      return;
    }

    const startTimeMs = performance.now();
    const result = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

    if (result.landmarks && result.landmarks.length > 0) {
      const tension = calculateTension(result);
      lastTensionRef.current = tension;
      onHandData({ tension, isDetected: true });
    } else {
      onHandData({ tension: lastTensionRef.current, isDetected: false });
    }

    animationFrameRef.current = requestAnimationFrame(detectHands);
  };

  useEffect(() => {
    initializeHandLandmarker();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (handLandmarker && !error) {
      startCamera();
    }
  }, [handLandmarker]);

  useEffect(() => {
    if (handLandmarker && videoRef.current && videoRef.current.readyState >= 2) {
      detectHands();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handLandmarker, onHandData]);

  const handleRetry = () => {
    setError(null);
    startCamera();
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative w-40 h-30 rounded-lg overflow-hidden shadow-2xl border-2 border-white/20 bg-black/50 backdrop-blur-sm">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-white text-xs">Initializing...</div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-2">
            <VideoOff className="w-6 h-6 text-red-400 mb-2" />
            <div className="text-white text-xs text-center mb-2">{error}</div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white text-xs transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-[-1]"
          playsInline
          muted
        />

        <div className="absolute bottom-1 left-1 right-1">
          <div className="text-[10px] text-white/80 text-center font-mono bg-black/50 px-1 py-0.5 rounded">
            Hand Tracking
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandTracker;
