import React, { useEffect } from "react";
import {
  useAudioSettingsStore,
  defaultFrequencies, // Теперь это 6 частот
  equalizerPresets,
  NormalizationMode,
  webAudioService,
} from "../../lib/webAudio";
import { Label } from "../../components/ui/label";
import { Slider } from "../../components/ui/slider";
import { Switch } from "../../components/ui/switch";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const SettingsPage: React.FC = () => {
  const {
    equalizerEnabled,
    equalizerGains,
    normalizationMode,
    waveAnalyzerEnabled,
    activePresetName,
    setEqualizerEnabled,
    setEqualizerGain,
    setNormalizationMode,
    setWaveAnalyzerEnabled,
    applyPreset,
    resetAudioSettings,
    // updateCustomPreset, // Больше не нужен здесь, так как логика в сторе
  } = useAudioSettingsStore();

  const frequencies = defaultFrequencies; // Теперь это массив из 6 частот

  useEffect(() => {
    if (
      webAudioService.getAudioContext() &&
      webAudioService.getAudioContext()?.state !== "closed"
    ) {
      webAudioService.applySettingsToGraph();
      console.log("SettingsPage mounted: Applied settings to audio graph.");
    }
  }, []);

  const handleSliderChange = (freq: string) => (value: number[]) => {
    setEqualizerGain(freq, value[0]);
    // updateCustomPreset() больше не нужен здесь, так как setEqualizerGain в webAudio.ts уже устанавливает "Custom"
  };

  const handlePresetChange = (presetName: string) => {
    const selectedPreset = equalizerPresets.find((p) => p.name === presetName);
    if (selectedPreset) {
      applyPreset(selectedPreset);
      if (!equalizerEnabled) {
        setEqualizerEnabled(true);
      }
    }
  };

  return (
    <ScrollArea className="h-full bg-radial from-violet-950 to-zinc-950">
      <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-2xl  ">
        <h1 className="text-3xl font-bold text-white mb-6">Audio Settings</h1>
        <Card className="bg-zinc-800 border-zinc-700 text-white shadow-lg p-6 space-y-8">
          {/* Equalizer Section */}
          <div className="border-b border-zinc-700 pb-8">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-xl font-semibold">Equalizer</Label>
              <Switch
                id="equalizer-mode"
                checked={equalizerEnabled}
                onCheckedChange={setEqualizerEnabled}
                className="data-[state=checked]:bg-violet-600"
              />
            </div>

            {equalizerEnabled && (
              <>
                <div className="mb-4">
                  <Select
                    onValueChange={handlePresetChange}
                    value={activePresetName}
                  >
                    <SelectTrigger className="w-full bg-zinc-700 border-zinc-600 text-white">
                      <SelectValue placeholder="Select a preset" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white max-h-60 overflow-y-auto">
                      {equalizerPresets.map((preset) => (
                        <SelectItem key={preset.name} value={preset.name}>
                          {preset.name}
                        </SelectItem>
                      ))}
                      {/* Убедимся, что "Custom" отображается только если он активен */}
                      {activePresetName === "Custom" &&
                        !equalizerPresets.some((p) => p.name === "Custom") && (
                          <SelectItem value="Custom">Custom</SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Адаптивная сетка для 6 ползунков */}
                <div className="grid grid-cols-6 gap-2 sm:gap-3 md:gap-4 mt-4 justify-items-center">
                  {frequencies.map((freq) => (
                    <div
                      key={freq}
                      className="flex flex-col items-center gap-1 sm:gap-2 w-full"
                    >
                      <Label
                        htmlFor={`slider-${freq}`}
                        className="text-zinc-400 text-[0.65rem] sm:text-xs whitespace-nowrap"
                      >
                        {freq} Hz
                      </Label>
                      <Slider
                        id={`slider-${freq}`}
                        min={-12}
                        max={12}
                        step={0.5}
                        value={[equalizerGains[freq] || 0]}
                        onValueChange={handleSliderChange(freq)}
                        className="h-24 w-2 vertical-slider relative"
                        orientation="vertical"
                      />
                      <span className="text-xs sm:text-sm text-zinc-300 whitespace-nowrap">
                        {equalizerGains[freq]?.toFixed(1)} dB
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Normalization Section */}
          <div className="border-b border-zinc-700 pb-8">
            <Label
              htmlFor="normalization-mode-select"
              className="text-xl font-semibold mb-4 block"
            >
              Normalization
            </Label>
            <Select
              value={normalizationMode}
              onValueChange={(value: NormalizationMode) =>
                setNormalizationMode(value)
              }
            >
              <SelectTrigger className="w-full bg-zinc-700 border-zinc-600 text-white">
                <SelectValue placeholder="Select a mode" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="loud">Loud</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="quiet">Quiet</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-zinc-400 text-sm mt-2">
              Automatically adjusts volume for more consistent playback.
            </p>
          </div>

          {/* Wave Analyzer Section */}
          <div className="border-b border-zinc-700 pb-8">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="wave-analyzer-toggle"
                className="text-xl font-semibold"
              >
                Wave Analyzer
              </Label>
              <Switch
                id="wave-analyzer-toggle"
                checked={waveAnalyzerEnabled}
                onCheckedChange={setWaveAnalyzerEnabled}
                className="data-[state=checked]:bg-violet-600"
              />
            </div>
            <p className="text-zinc-400 text-sm mt-2">
              Show wave visualizer in the topbar.
            </p>
          </div>

          {/* Reset Settings */}
          <div>
            <Button
              onClick={resetAudioSettings}
              variant="outline"
              className="w-full bg-red-600 hover:bg-red-700 text-white border-red-700 hover:border-red-800"
            >
              Reset All Audio Settings
            </Button>
            <p className="text-zinc-400 text-sm mt-2 text-center">
              Resets equalizer, normalization, and wave analyzer settings to
              default values.
            </p>
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default SettingsPage;
