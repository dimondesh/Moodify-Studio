// src/components/ui/WaveAnalyzer.tsx
import React, { useRef, useEffect } from "react";
import { useAudioSettingsStore, webAudioService } from "../../lib/webAudio";

interface WaveAnalyzerProps {
  width?: number;
  height?: number;
}

const WaveAnalyzer: React.FC<WaveAnalyzerProps> = ({
  width = 120,
  height = 30,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const { waveAnalyzerEnabled } = useAudioSettingsStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) {
      console.error("WaveAnalyzer: Canvas context is null.");
      return;
    }

    const analyser = webAudioService.getAnalyserNode();
    const audioContext = webAudioService.getAudioContext();

   
    if (!analyser || !audioContext) {
      console.log("WaveAnalyzer: Analyser or AudioContext not available yet.");
      canvasCtx.clearRect(0, 0, width, height);
      return;
    }

    console.log(`WaveAnalyzer: Effect triggered.
      waveAnalyzerEnabled: ${waveAnalyzerEnabled},
      AudioContext State: ${audioContext.state}`);

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const currentAnalyser = webAudioService.getAnalyserNode();
      const currentAudioContext = webAudioService.getAudioContext();
      const currentWaveAnalyzerEnabled =
        useAudioSettingsStore.getState().waveAnalyzerEnabled;

      
      if (
        !currentWaveAnalyzerEnabled ||
        !currentAnalyser ||
        !currentAudioContext
      ) {
        canvasCtx.clearRect(0, 0, width, height);
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;
        }
        console.log(
          "WaveAnalyzer: Stopping animation loop due to disabled setting or missing nodes."
        );
        return;
      }

      animationFrameId.current = requestAnimationFrame(draw);

      if (
        currentAudioContext.state === "suspended" ||
        currentAudioContext.state === "closed"
      ) {
        canvasCtx.clearRect(0, 0, width, height);
        canvasCtx.lineWidth = 1;
        canvasCtx.strokeStyle = "#8b5cf6";
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, height / 2);
        canvasCtx.lineTo(width, height / 2);
        canvasCtx.stroke();
      } else {
        currentAnalyser.getByteTimeDomainData(dataArray);

        canvasCtx.clearRect(0, 0, width, height);
        canvasCtx.lineWidth = 1;
        canvasCtx.strokeStyle = "#8b5cf6";

        canvasCtx.beginPath();

        const sliceWidth = (width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        canvasCtx.lineTo(width, height / 2);
        canvasCtx.stroke();
      }
    };

  
    if (waveAnalyzerEnabled) {
      console.log("WaveAnalyzer: Starting initial animation loop.");
      draw();
    } else {
      console.log(
        "WaveAnalyzer: waveAnalyzerEnabled is false, clearing canvas."
      );
      canvasCtx.clearRect(0, 0, width, height);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }

    return () => {
      console.log(
        "WaveAnalyzer: Cleanup effect (component unmount or dependencies change)."
      );
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      canvasCtx.clearRect(0, 0, width, height); 
    };
  }, [waveAnalyzerEnabled, width, height]);


  if (!waveAnalyzerEnabled) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-full overflow-hidden"
      style={{
        transform: "scaleX(1.2)",
        transformOrigin: "center",
      }}
    />
  );
};

export default WaveAnalyzer;
