// frontend/src/pages/SettingsPage/SettingsPage.tsx

import React, { useEffect, useState } from "react";
import {
  defaultFrequencies,
  equalizerPresets,
  NormalizationMode,
  webAudioService,
  ReverbRoomSize,
  reverbIRPaths,
  useAudioSettingsStore,
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
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../stores/useAuthStore";
import { Helmet } from "react-helmet-async";
import { useOfflineStore } from "../../stores/useOfflineStore";

const SettingsPage: React.FC = () => {
  const {
    equalizerEnabled,
    equalizerGains,
    normalizationMode,
    waveAnalyzerEnabled,
    activePresetName,
    reverbEnabled,
    reverbMix,
    reverbRoomSize,
    setEqualizerEnabled,
    setEqualizerGain,
    setNormalizationMode,
    setWaveAnalyzerEnabled,
    applyPreset,
    resetAudioSettings,
    setReverbEnabled,
    setReverbMix,
    setReverbRoomSize,
  } = useAudioSettingsStore();

  const { t, i18n } = useTranslation();
  const { updateUserLanguage } = useAuthStore();

  const frequencies = defaultFrequencies;

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

  const handleReverbRoomSizeChange = (value: string) => {
    setReverbRoomSize(value as ReverbRoomSize);
    if (!reverbEnabled) {
      setReverbEnabled(true);
    }
  };
  const handleLanguageChange = async (lang: string) => {
    if (lang !== i18n.language) {
      await i18n.changeLanguage(lang);
      try {
        await updateUserLanguage(lang);
      } catch (error) {
        console.error("Failed to save language preference:", error);
      }
    }
  };
  const { getStorageUsage, clearAllDownloads } = useOfflineStore(
    (s) => s.actions
  );
  const [storageUsage, setStorageUsage] = useState({ usage: 0, quota: 0 });

  useEffect(() => {
    getStorageUsage().then(setStorageUsage);
  }, [getStorageUsage]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <>
      {" "}
      <Helmet>
        <title>Settings - Moodify</title>
        <meta
          name="description"
          content="Manage your language preferences and audio settings, including equalizer, reverb, and normalization, on Moodify."
        />
      </Helmet>
      <ScrollArea className="h-full bg-radial from-violet-950 to-zinc-950">
        <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-2xl  ">
          <h1 className="text-3xl font-bold text-white mb-6">
            {t("settings.title")}
          </h1>
          <Card className="bg-zinc-800 border-zinc-700 text-white shadow-lg p-6 space-y-8 mb-8">
            <div>
              <Label className="text-xl font-semibold mb-4 block">
                {t("settings.language")}
              </Label>
              <Select
                value={i18n.language}
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger className="w-full bg-zinc-700 border-zinc-600 text-white">
                  <SelectValue placeholder={t("settings.language")} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="uk">Українська</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
          <h1 className="text-3xl font-bold text-white mb-6">
            {t("settings.audioTitle")}
          </h1>
          <Card className="bg-zinc-800 border-zinc-700 text-white shadow-lg p-6 space-y-8">
            {/* Equalizer Section */}
            <div className="border-b border-zinc-700 pb-8">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-xl font-semibold">
                  {t("settings.equalizer")}
                </Label>
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
                        <SelectValue placeholder={t("settings.selectPreset")} />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white max-h-60 overflow-y-auto">
                        {equalizerPresets.map((preset) => (
                          <SelectItem key={preset.name} value={preset.name}>
                            {preset.name}
                          </SelectItem>
                        ))}
                        {activePresetName === "Custom" &&
                          !equalizerPresets.some(
                            (p) => p.name === "Custom"
                          ) && (
                            <SelectItem value="Custom">
                              {t("settings.custom")}
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                  </div>

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

            {/* Reverb Section */}
            <div className="border-b border-zinc-700 pb-8">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-xl font-semibold">
                  {t("settings.reverb")}
                </Label>
                <Switch
                  id="reverb-enabled"
                  checked={reverbEnabled}
                  onCheckedChange={setReverbEnabled}
                  className="data-[state=checked]:bg-violet-600"
                />
              </div>

              {reverbEnabled && (
                <>
                  <div className="mb-4">
                    <Label
                      htmlFor="reverb-room-size"
                      className="text-sm font-medium text-zinc-400 mb-2 block"
                    >
                      {t("settings.roomSize")}
                    </Label>
                    <Select
                      value={reverbRoomSize}
                      onValueChange={handleReverbRoomSizeChange}
                    >
                      <SelectTrigger className="w-full bg-zinc-700 border-zinc-600 text-white">
                        <SelectValue
                          placeholder={t("settings.selectRoomSize")}
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        {Object.keys(reverbIRPaths).map((size) => (
                          <SelectItem key={size} value={size}>
                            {t(
                              `settings.${size as "small" | "medium" | "large"}`
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mb-4">
                    <Label
                      htmlFor="reverb-mix"
                      className="text-sm font-medium text-zinc-400 mb-2 block"
                    >
                      {t("settings.dryWetMix")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">
                        {t("settings.dry")}
                      </span>
                      <Slider
                        id="reverb-mix"
                        min={0}
                        max={100}
                        step={1}
                        value={[reverbMix * 100]}
                        onValueChange={(value) => setReverbMix(value[0] / 100)}
                        className="flex-1 hover:cursor-grab active:cursor-grabbing"
                      />
                      <span className="text-xs text-zinc-400">
                        {t("settings.wet")}
                      </span>
                      <span className="text-xs sm:text-sm text-zinc-300 whitespace-nowrap">
                        {(reverbMix * 100).toFixed(0)}%
                      </span>
                    </div>
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
                {t("settings.normalization")}
              </Label>
              <Select
                value={normalizationMode}
                onValueChange={(value: NormalizationMode) =>
                  setNormalizationMode(value)
                }
              >
                <SelectTrigger className="w-full bg-zinc-700 border-zinc-600 text-white">
                  <SelectValue placeholder={t("settings.selectMode")} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectItem value="off">{t("settings.off")}</SelectItem>
                  <SelectItem value="loud">{t("settings.loud")}</SelectItem>
                  <SelectItem value="normal">{t("settings.normal")}</SelectItem>
                  <SelectItem value="quiet">{t("settings.quiet")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-zinc-400 text-sm mt-2">
                {t("settings.normalizationDesc")}
              </p>
            </div>

            {/* Wave Analyzer Section */}
            <div className="border-b border-zinc-700 pb-8">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="wave-analyzer-toggle"
                  className="text-xl font-semibold"
                >
                  {t("settings.waveAnalyzer")}
                </Label>
                <Switch
                  id="wave-analyzer-toggle"
                  checked={waveAnalyzerEnabled}
                  onCheckedChange={setWaveAnalyzerEnabled}
                  className="data-[state=checked]:bg-violet-600"
                />
              </div>
              <p className="text-zinc-400 text-sm mt-2">
                {t("settings.waveAnalyzerDesc")}
              </p>
            </div>

            {/* Reset Settings */}
            <div>
              <Button
                onClick={resetAudioSettings}
                variant="outline"
                className="w-full bg-red-600 hover:bg-red-700 text-white border-red-700 hover:border-red-800"
              >
                {t("settings.resetAudio")}
              </Button>
              <p className="text-zinc-400 text-sm mt-2 text-center">
                {t("settings.resetAudioDesc")}
              </p>
            </div>
          </Card>
          {/* ===== 4. НОВЫЙ РАЗДЕЛ ДЛЯ СКАЧИВАНИЙ ===== */}
          <h1 className="text-3xl font-bold text-white mb-6 mt-8">Downloads</h1>
          <Card className="bg-zinc-800 border-zinc-700 text-white shadow-lg p-6 space-y-8">
            <div>
              <Label className="text-xl font-semibold mb-4 block">
                Storage Management
              </Label>
              <div className="bg-zinc-700/50 p-4 rounded-md">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Used Storage</span>
                  <span className="font-semibold">
                    {formatBytes(storageUsage.usage)}
                  </span>
                </div>
                <div className="w-full bg-zinc-600 rounded-full h-2.5 mt-2">
                  <div
                    className="bg-violet-600 h-2.5 rounded-full"
                    style={{
                      width: `${
                        (storageUsage.usage / storageUsage.quota) * 100
                      }%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-500 mt-2 text-right">
                  Total available: {formatBytes(storageUsage.quota)}
                </p>
              </div>

              <div className="mt-6">
                <Button
                  onClick={clearAllDownloads}
                  variant="destructive"
                  className="w-full"
                >
                  Clear All Downloads
                </Button>
                <p className="text-zinc-400 text-sm mt-2 text-center">
                  This will remove all downloaded songs, albums, and playlists
                  from this device.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </>
  );
};

export default SettingsPage;
