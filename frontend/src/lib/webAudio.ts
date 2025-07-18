/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Интерфейс для состояний нормализации
export type NormalizationMode = "off" | "loud" | "normal" | "quiet";

// Изменяем частоты по умолчанию для 6-полосного эквалайзера
export const defaultFrequencies = [
  "60",
  "310",
  "1000",
  "3000",
  "6000",
  "12000",
]; // Оставляем 6 частот

// Тип для эквалайзерного пресета
export interface EqualizerPreset {
  name: string;
  gains: { [key: string]: number };
}

const defaultGains = Object.fromEntries(
  defaultFrequencies.map((freq) => [freq, 0])
);

// Обновленные пресеты эквалайзера для 6 полос
export const equalizerPresets: EqualizerPreset[] = [
  { name: "Flat", gains: { ...defaultGains } },
  {
    name: "Bass Boost",
    gains: {
      "60": 6,
      "310": 3,
      "1000": 0,
      "3000": -1,
      "6000": -2,
      "12000": -3,
    },
  },
  {
    name: "Vocal Boost",
    gains: {
      "60": -3,
      "310": 2,
      "1000": 5,
      "3000": 3,
      "6000": 1,
      "12000": 0,
    },
  },
  {
    name: "Treble Boost",
    gains: {
      "60": -3,
      "310": -2,
      "1000": 0,
      "3000": 3,
      "6000": 5,
      "12000": 6,
    },
  },
  {
    name: "Rock",
    gains: {
      "60": 4,
      "310": -2,
      "1000": -1,
      "3000": 2,
      "6000": 4,
      "12000": 5,
    },
  },
  {
    name: "Pop",
    gains: {
      "60": 2,
      "310": 3,
      "1000": 0,
      "3000": -2,
      "6000": 1,
      "12000": 2,
    },
  },
  {
    name: "Acoustic",
    gains: {
      "60": 3,
      "310": 0,
      "1000": -1,
      "3000": -2,
      "6000": 1,
      "12000": 3,
    },
  },
  {
    name: "Electronic",
    gains: {
      "60": 5,
      "310": 0,
      "1000": -2,
      "3000": 3,
      "6000": 5,
      "12000": 4,
    },
  },
  {
    name: "Jazz",
    gains: {
      "60": 2,
      "310": 0,
      "1000": -2,
      "3000": -1,
      "6000": 2,
      "12000": 4,
    },
  },
  {
    name: "Classical",
    gains: {
      "60": 0,
      "310": 0,
      "1000": 0,
      "3000": 0,
      "6000": 0,
      "12000": 0,
    },
  },
  {
    name: "Dance",
    gains: {
      "60": 5,
      "310": 0,
      "1000": -1,
      "3000": 2,
      "6000": 4,
      "12000": 5,
    },
  },
  {
    name: "R&B",
    gains: {
      "60": 4,
      "310": 0,
      "1000": -1,
      "3000": 2,
      "6000": 3,
      "12000": 4,
    },
  },
  {
    name: "Lounge",
    gains: {
      "60": 3,
      "310": 1,
      "1000": -1,
      "3000": -2,
      "6000": -1,
      "12000": 1,
    },
  },
  {
    name: "Gaming",
    gains: {
      "60": 4,
      "310": 0,
      "1000": 1,
      "3000": 3,
      "6000": 5,
      "12000": 4,
    },
  },
  {
    name: "Speech",
    gains: {
      "60": -6,
      "310": -2,
      "1000": 4,
      "3000": 6,
      "6000": 4,
      "12000": 2,
    },
  },
];

// Интерфейс для состояния настроек аудио
interface AudioSettings {
  equalizerEnabled: boolean;
  equalizerGains: { [key: string]: number };
  normalizationMode: NormalizationMode;
  waveAnalyzerEnabled: boolean;
  activePresetName: string; // Добавили активный пресет
}

// Интерфейс для экшенов Zustand-хранилища
interface AudioStore extends AudioSettings {
  setEqualizerEnabled: (enabled: boolean) => void;
  setEqualizerGain: (frequency: string, gain: number) => void;
  setNormalizationMode: (mode: NormalizationMode) => void;
  setWaveAnalyzerEnabled: (enabled: boolean) => void;
  applyPreset: (preset: EqualizerPreset) => void; // Новый метод для применения пресета
  resetAudioSettings: () => void;
  updateCustomPreset: () => void; // Метод для установки "Custom" при ручной настройке
}

// Zustand store для настроек аудио с сохранением в localStorage
export const useAudioSettingsStore = create<AudioStore>()(
  persist(
    (set) => ({
      equalizerEnabled: false,
      equalizerGains: { ...equalizerPresets[0].gains }, // Дефолт - "Flat"
      normalizationMode: "off",
      waveAnalyzerEnabled: true,
      activePresetName: equalizerPresets[0].name, // Дефолт - "Flat"
      setEqualizerEnabled: (enabled) => {
        set({ equalizerEnabled: enabled });
        webAudioService.applySettingsToGraph();
      },
      setEqualizerGain: (frequency, gain) => {
        set((state) => ({
          equalizerGains: {
            ...state.equalizerGains,
            [frequency]: gain,
          },
          activePresetName: "Custom", // При изменении любой полосы -> Custom
        }));
        webAudioService.applySettingsToGraph();
      },
      setNormalizationMode: (mode) => {
        set({ normalizationMode: mode });
        webAudioService.applySettingsToGraph();
      },
      setWaveAnalyzerEnabled: (enabled) =>
        set({ waveAnalyzerEnabled: enabled }),
      applyPreset: (preset) => {
        set({
          equalizerGains: { ...preset.gains },
          activePresetName: preset.name,
        });
        webAudioService.applySettingsToGraph();
      },
      resetAudioSettings: () =>
        set({
          equalizerEnabled: false,
          equalizerGains: { ...equalizerPresets[0].gains }, // Сбрасываем на "Flat"
          normalizationMode: "off",
          waveAnalyzerEnabled: true,
          activePresetName: equalizerPresets[0].name, // Сбрасываем на "Flat"
        }),
      updateCustomPreset: () => {
        set({ activePresetName: "Custom" });
      },
    }),
    {
      name: "audio-settings-storage",
      version: 1, // Версия не меняется, так как мы просто обновили defaultFrequencies
      // Если у пользователя уже были сохранены старые 9 частот, они будут
      // перезаписаны новыми 6, когда применится пресет или начнутся ручные изменения.
      // Это нормально, так как старые частоты больше не будут использоваться.
      migrate: (persistedState: any, version) => {
        if (version === 0 && persistedState) {
          // Если старая версия без activePresetName
          persistedState.activePresetName = "Flat"; // Лучше установить 'Flat' по умолчанию
          // Также обнуляем gains, так как частоты изменились
          persistedState.equalizerGains = { ...equalizerPresets[0].gains };
        }
        return persistedState as AudioStore;
      },
    }
  )
);

// Сервис для работы с Web Audio API эффектами
class WebAudioService {
  private static instance: WebAudioService;
  private audioContext: AudioContext | null = null;
  private inputNode: AudioNode | null = null;
  private outputNode: AudioNode | null = null;

  private analyserNode: AnalyserNode | null = null;
  private gainNodes: { [key: string]: BiquadFilterNode } = {};
  private compressorNode: DynamicsCompressorNode | null = null;
  private internalOutputNode: GainNode | null = null;

  private constructor() {}

  public static getInstance(): WebAudioService {
    if (!WebAudioService.instance) {
      WebAudioService.instance = new WebAudioService();
    }
    return WebAudioService.instance;
  }

  public init(context: AudioContext, input: AudioNode, output: AudioNode) {
    if (
      this.audioContext === context &&
      this.inputNode === input &&
      this.outputNode === output &&
      Object.keys(this.gainNodes).length === defaultFrequencies.length // Добавлена проверка на количество узлов
    ) {
      this.applySettingsToGraph();
      return;
    }

    this.audioContext = context;
    this.inputNode = input;
    this.outputNode = output;

    this.cleanupNodes();

    this.internalOutputNode = this.audioContext.createGain();

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.minDecibels = -90;
    this.analyserNode.maxDecibels = -10;
    this.analyserNode.smoothingTimeConstant = 0.85;

    // Инициализируем только нужные 6 фильтров
    defaultFrequencies.map(Number).forEach((freq) => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = freq;
      filter.Q.value = 1;
      filter.gain.value = 0;
      this.gainNodes[freq.toString()] = filter;
    });

    this.compressorNode = this.audioContext.createDynamicsCompressor();

    console.log("WebAudioService initialized. Connecting nodes...");
    this.applySettingsToGraph();
  }

  private cleanupNodes() {
    if (!this.audioContext) return;

    if (this.inputNode) {
      try {
        this.inputNode.disconnect();
      } catch (e) {
        console.warn("Error disconnecting input node during cleanup:", e);
      }
    }

    Object.values(this.gainNodes).forEach((filter) => {
      try {
        filter.disconnect();
      } catch (e) {
        console.warn("Error disconnecting gain node during cleanup:", e);
      }
    });
    this.gainNodes = {}; // Очищаем gainNodes

    if (this.compressorNode) {
      try {
        this.compressorNode.disconnect();
      } catch (e) {
        console.warn("Error disconnecting compressor node during cleanup:", e);
      }
      this.compressorNode = null;
    }
    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch (e) {
        console.warn("Error disconnecting analyser node during cleanup:", e);
      }
      this.analyserNode = null;
    }
    if (this.internalOutputNode) {
      try {
        this.internalOutputNode.disconnect();
      } catch (e) {
        console.warn(
          "Error disconnecting internalOutputNode during cleanup:",
          e
        );
      }
      this.internalOutputNode = null;
    }
  }

  public applySettingsToGraph() {
    if (
      !this.audioContext ||
      !this.inputNode ||
      !this.outputNode ||
      !this.internalOutputNode
    ) {
      console.warn(
        "WebAudioService not fully initialized. Cannot apply settings to graph."
      );
      return;
    }

    const settings = useAudioSettingsStore.getState();

    // Отключаем все узлы перед перестройкой
    try {
      this.inputNode.disconnect();
    } catch (e) {}

    Object.values(this.gainNodes).forEach((filter) => {
      try {
        filter.disconnect();
      } catch (e) {}
    });
    if (this.compressorNode) {
      try {
        this.compressorNode.disconnect();
      } catch (e) {}
    }
    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch (e) {}
    }
    try {
      this.internalOutputNode.disconnect();
    } catch (e) {}

    let currentNode: AudioNode = this.inputNode;

    if (settings.equalizerEnabled) {
      // Подключаем только те фильтры, которые соответствуют defaultFrequencies
      defaultFrequencies.map(Number).forEach((freqNum) => {
        const freqStr = freqNum.toString();
        const filter = this.gainNodes[freqStr];
        if (filter) {
          filter.gain.value = settings.equalizerGains[freqStr] || 0;
          currentNode.connect(filter);
          currentNode = filter;
        }
      });
    }

    if (settings.normalizationMode !== "off" && this.compressorNode) {
      this.applyNormalizationSettings(settings.normalizationMode);
      currentNode.connect(this.compressorNode);
      currentNode = this.compressorNode;
    }

    currentNode.connect(this.internalOutputNode);

    if (settings.waveAnalyzerEnabled && this.analyserNode) {
      this.internalOutputNode.connect(this.analyserNode);
    }

    this.internalOutputNode.connect(this.outputNode);

    console.log("WebAudioService audio graph rebuilt.");
  }

  private applyNormalizationSettings(mode: NormalizationMode) {
    if (!this.compressorNode || !this.audioContext) return;

    // Убедимся, что параметры сброшены перед применением новых, если нужно
    this.compressorNode.threshold.setValueAtTime(
      0,
      this.audioContext.currentTime
    );
    this.compressorNode.ratio.setValueAtTime(1, this.audioContext.currentTime);
    this.compressorNode.attack.setValueAtTime(
      0.003,
      this.audioContext.currentTime
    );
    this.compressorNode.release.setValueAtTime(
      0.25,
      this.audioContext.currentTime
    );

    switch (mode) {
      case "loud":
        this.compressorNode.threshold.setValueAtTime(
          -18,
          this.audioContext.currentTime
        );
        this.compressorNode.ratio.setValueAtTime(
          8,
          this.audioContext.currentTime
        );
        this.compressorNode.attack.setValueAtTime(
          0.005,
          this.audioContext.currentTime
        );
        this.compressorNode.release.setValueAtTime(
          0.15,
          this.audioContext.currentTime
        );
        break;
      case "normal":
        this.compressorNode.threshold.setValueAtTime(
          -24,
          this.audioContext.currentTime
        );
        this.compressorNode.ratio.setValueAtTime(
          12,
          this.audioContext.currentTime
        );
        this.compressorNode.attack.setValueAtTime(
          0.003,
          this.audioContext.currentTime
        );
        this.compressorNode.release.setValueAtTime(
          0.25,
          this.audioContext.currentTime
        );
        break;
      case "quiet":
        this.compressorNode.threshold.setValueAtTime(
          -30,
          this.audioContext.currentTime
        );
        this.compressorNode.ratio.setValueAtTime(
          16,
          this.audioContext.currentTime
        );
        this.compressorNode.attack.setValueAtTime(
          0.001,
          this.audioContext.currentTime
        );
        this.compressorNode.release.setValueAtTime(
          0.35,
          this.audioContext.currentTime
        );
        break;
      case "off":
      default:
        // Параметры уже сброшены до значений по умолчанию в начале функции
        break;
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

export const webAudioService = WebAudioService.getInstance();

useAudioSettingsStore.subscribe((state, prevState) => {
  if (
    webAudioService.getAudioContext() &&
    webAudioService.getAudioContext()?.state !== "closed"
  ) {
    const equalizerGainsChanged = Object.keys(state.equalizerGains).some(
      (key) => state.equalizerGains[key] !== prevState.equalizerGains[key]
    );

    // Trigger graph rebuild if relevant settings change or if activePresetName changes to "Custom"
    // to ensure UI updates and graph reflects current gains.
    if (
      state.equalizerEnabled !== prevState.equalizerEnabled ||
      state.normalizationMode !== prevState.normalizationMode ||
      equalizerGainsChanged || // При изменении любой полосы
      (state.activePresetName === "Custom" &&
        prevState.activePresetName !== "Custom") // Когда пресет меняется на Custom
    ) {
      webAudioService.applySettingsToGraph();
    }
  }
});
