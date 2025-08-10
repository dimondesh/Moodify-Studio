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

// пресеты эквалайзера для 6 полос
export const equalizerPresets: EqualizerPreset[] = [
  {
    name: "Flat",
    gains: Object.fromEntries(defaultFrequencies.map((freq) => [freq, 0])),
  },
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

// --- ТИПЫ ДЛЯ РЕВЕРБЕРАЦИИ ---
export type ReverbRoomSize = "small" | "medium" | "large";

// Маппинг размеров комнат к путям IR-файлов
export const reverbIRPaths: Record<ReverbRoomSize, string> = {
  small: "/ir/small-room.wav",
  medium: "/ir/medium-room.wav",
  large: "/ir/large-hall.wav",
};

// Интерфейс для состояния настроек аудио
interface AudioSettings {
  equalizerEnabled: boolean;
  equalizerGains: { [key: string]: number };
  normalizationMode: NormalizationMode;
  waveAnalyzerEnabled: boolean;
  activePresetName: string; // активный пресет
  reverbEnabled: boolean;
  reverbMix: number; // 0.0 (dry) to 1.0 (wet)
  reverbRoomSize: ReverbRoomSize;
}

// Интерфейс для экшенов Zustand-хранилища
interface AudioStore extends AudioSettings {
  setEqualizerEnabled: (enabled: boolean) => void;
  setEqualizerGain: (frequency: string, gain: number) => void;
  setNormalizationMode: (mode: NormalizationMode) => void;
  setWaveAnalyzerEnabled: (enabled: boolean) => void;
  applyPreset: (preset: EqualizerPreset) => void; 
  resetAudioSettings: () => void;
  updateCustomPreset: () => void; // Метод для установки "Custom" при ручной настройке
  setReverbEnabled: (enabled: boolean) => void;
  setReverbMix: (mix: number) => void;
  setReverbRoomSize: (size: ReverbRoomSize) => Promise<void>;
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
      // --- ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЙ РЕВЕРБЕРАЦИИ ---
      reverbEnabled: false,
      reverbMix: 0.5, // По умолчанию 50% Dry / 50% Wet
      reverbRoomSize: "medium", // По умолчанию средняя комната

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
      resetAudioSettings: () => {
        set({
          equalizerEnabled: false,
          equalizerGains: { ...equalizerPresets[0].gains }, // Сбрасываем на "Flat"
          normalizationMode: "off",
          waveAnalyzerEnabled: true,
          activePresetName: equalizerPresets[0].name, // Сбрасываем на "Flat"
          // --- СБРОС НАСТРОЕК РЕВЕРБЕРАЦИИ ---
          reverbEnabled: false,
          reverbMix: 0.5,
          reverbRoomSize: "medium",
        });
        webAudioService.applySettingsToGraph();
      },
      updateCustomPreset: () => {
        set({ activePresetName: "Custom" });
      },
      setReverbEnabled: (enabled) => {
        set({ reverbEnabled: enabled });
        webAudioService.applySettingsToGraph();
      },
      setReverbMix: (mix) => {
        set({ reverbMix: mix });
        webAudioService.applySettingsToGraph();
      },
      setReverbRoomSize: async (size) => {
        set({ reverbRoomSize: size });
        // Загружаем новый IR-файл и применяем настройки
        await webAudioService.loadIRFile(size);
        // webAudioService.applySettingsToGraph() вызывается внутри loadIRFile
      },
    }),
    {
      name: "audio-settings-storage",
      version: 2, 
      migrate: (persistedState: any, version) => {
        if (version === 0 && persistedState) {
          persistedState.activePresetName = "Flat";
          persistedState.equalizerGains = { ...equalizerPresets[0].gains };
        }
        if (version < 2 && persistedState) {
          persistedState.reverbEnabled = false;
          persistedState.reverbMix = 0.5;
          persistedState.reverbRoomSize = "medium";
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
  private inputNode: AudioNode | null = null; // Входной узел из AudioPlayer (masterGainNode)
  private outputNode: AudioNode | null = null; // Выходной узел (audioContext.destination)

  private analyserNode: AnalyserNode | null = null;
  private gainNodes: { [key: string]: BiquadFilterNode } = {}; // Узлы эквалайзера
  private compressorNode: DynamicsCompressorNode | null = null;
  private internalOutputNode: GainNode | null = null; // Узел, к которому подключаются все эффекты перед анализатором/выходом

  private convolverNode: ConvolverNode | null = null;
  private dryGainNode: GainNode | null = null;
  private wetGainNode: GainNode | null = null;
  private irBufferCache: Map<ReverbRoomSize, AudioBuffer> = new Map(); // Кэш для IR-файлов

  private constructor() {}

  public static getInstance(): WebAudioService {
    if (!WebAudioService.instance) {
      WebAudioService.instance = new WebAudioService();
    }
    return WebAudioService.instance;
  }

  public init(context: AudioContext, input: AudioNode, output: AudioNode) {
    // Если контекст уже инициализирован и узлы совпадают, просто применяем настройки
    if (
      this.audioContext === context &&
      this.inputNode === input &&
      this.outputNode === output &&
      Object.keys(this.gainNodes).length === defaultFrequencies.length &&
      this.convolverNode &&
      this.dryGainNode &&
      this.wetGainNode
    ) {
      this.applySettingsToGraph();
      return;
    }

    this.audioContext = context;
    this.inputNode = input;
    this.outputNode = output;

    this.cleanupNodes(); // Очищаем старые узлы перед новой инициализацией

    // Создаем основные узлы, если их нет
    this.internalOutputNode = this.audioContext.createGain();
    this.analyserNode = this.audioContext.createAnalyser();
    this.compressorNode = this.audioContext.createDynamicsCompressor();

    // Создаем узлы реверберации
    this.convolverNode = this.audioContext.createConvolver();
    this.dryGainNode = this.audioContext.createGain();
    this.wetGainNode = this.audioContext.createGain();

    // Настраиваем анализатор
    this.analyserNode.fftSize = 2048;
    this.analyserNode.minDecibels = -90;
    this.analyserNode.maxDecibels = -10;
    this.analyserNode.smoothingTimeConstant = 0.85;

    // Инициализируем 6 фильтров эквалайзера
    defaultFrequencies.map(Number).forEach((freq) => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = freq;
      filter.Q.value = 1;
      filter.gain.value = 0;
      this.gainNodes[freq.toString()] = filter;
    });

    console.log("WebAudioService initialized. Connecting nodes...");

    // Загружаем IR-файл по умолчанию при инициализации
    // Используем useAudioSettingsStore для получения настроек реверберации
    const currentRoomSize = useAudioSettingsStore.getState().reverbRoomSize;
    this.loadIRFile(currentRoomSize).then(() => {
      this.applySettingsToGraph();
    });
  }

  // Метод для очистки всех узлов и их отключения
  private cleanupNodes() {
    if (!this.audioContext) return;

    // Отключаем все узлы, которые могли быть подключены
    try {
      if (this.inputNode) this.inputNode.disconnect();
    } catch (e) {
      console.warn("Error disconnecting input node during cleanup:", e);
    }

    Object.values(this.gainNodes).forEach((filter) => {
      try {
        filter.disconnect();
      } catch (e) {
        console.warn("Error disconnecting gain node during cleanup:", e);
      }
    });
    this.gainNodes = {}; // Очищаем gainNodes

    try {
      if (this.compressorNode) this.compressorNode.disconnect();
    } catch (e) {
      console.warn("Error disconnecting compressor node during cleanup:", e);
    }
    this.compressorNode = null;

    try {
      if (this.convolverNode) this.convolverNode.disconnect();
    } catch (e) {
      console.warn("Error disconnecting convolver node during cleanup:", e);
    }
    this.convolverNode = null;

    try {
      if (this.dryGainNode) this.dryGainNode.disconnect();
    } catch (e) {
      console.warn("Error disconnecting dryGain node during cleanup:", e);
    }
    this.dryGainNode = null;

    try {
      if (this.wetGainNode) this.wetGainNode.disconnect();
    } catch (e) {
      console.warn("Error disconnecting wetGain node during cleanup:", e);
    }
    this.wetGainNode = null;

    try {
      if (this.analyserNode) this.analyserNode.disconnect();
    } catch (e) {
      console.warn("Error disconnecting analyser node during cleanup:", e);
    }
    this.analyserNode = null;

    try {
      if (this.internalOutputNode) this.internalOutputNode.disconnect();
    } catch (e) {
      console.warn("Error disconnecting internalOutputNode during cleanup:", e);
    }
    this.internalOutputNode = null;
  }

  // --- Загрузка и кэширование IR-файлов ---
  public async loadIRFile(roomSize: ReverbRoomSize): Promise<void> {
    if (!this.audioContext || !this.convolverNode) {
      console.warn("AudioContext or ConvolverNode not ready for IR loading.");
      return;
    }

    // 1. Проверяем быстрый кэш в памяти (для текущей сессии)
    if (this.irBufferCache.has(roomSize)) {
      this.convolverNode.buffer = this.irBufferCache.get(roomSize)!;
      console.log(`IR file for ${roomSize} loaded from memory cache.`);
      this.applySettingsToGraph();
      return;
    }

    const url = reverbIRPaths[roomSize];
    if (!url) {
      console.error(`No IR path defined for room size: ${roomSize}`);
      return;
    }

    try {

      // 2. Определяем имя кэша и пытаемся получить доступ к нему
      const cacheName = "moodify-ir-files-cache"; // Специальный кэш для IR-файлов
      const cache = await caches.open(cacheName);
      let response = await cache.match(url);

      // 3. Если ответа нет в кэше, загружаем его из сети и сохраняем
      if (!response) {
        console.log(
          `[Cache] IR file not found for ${url}. Fetching from network and caching...`
        );
        // Загружаем из сети
        const fetchResponse = await fetch(url);
        if (!fetchResponse.ok) {
          throw new Error(
            `Failed to fetch IR file: ${fetchResponse.status} ${fetchResponse.statusText}`
          );
        }
        // Клонируем ответ, так как его тело можно прочитать только один раз
        // Один клон пойдет в кэш, другой - для декодирования
        await cache.put(url, fetchResponse.clone());
        response = fetchResponse; // Используем оригинальный ответ для дальнейшей обработки
      } else {
        console.log(`[Cache] IR file for ${url} loaded from Cache Storage.`);
      }


      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Сохраняем в кэш в памяти для быстрого доступа в этой же сессии
      this.irBufferCache.set(roomSize, audioBuffer);
      this.convolverNode.buffer = audioBuffer;
      console.log(`IR file for ${roomSize} loaded and set.`);
      this.applySettingsToGraph();
    } catch (error) {
      console.error(
        `Error loading or decoding IR file for ${roomSize}:`,
        error
      );
      if (this.convolverNode) {
        this.convolverNode.buffer = null;
      }
      this.applySettingsToGraph();
    }
  }

  public applySettingsToGraph() {
    if (
      !this.audioContext ||
      !this.inputNode ||
      !this.outputNode ||
      !this.internalOutputNode ||
      !this.convolverNode ||
      !this.dryGainNode ||
      !this.wetGainNode ||
      !this.compressorNode || // Убедимся, что компрессор инициализирован
      !this.analyserNode // Убедимся, что анализатор инициализирован
    ) {
      console.warn(
        "WebAudioService not fully initialized. Cannot apply settings to graph."
      );
      return;
    }

    // Получаем настройки из useAudioSettingsStore
    const settings = useAudioSettingsStore.getState();

    // Отключаем все узлы от их предыдущих соединений перед перестройкой
    try {
      this.inputNode.disconnect();
    } catch (e) {}
    Object.values(this.gainNodes).forEach((filter) => {
      try {
        filter.disconnect();
      } catch (e) {}
    });
    try {
      this.compressorNode.disconnect();
    } catch (e) {}
    try {
      this.dryGainNode.disconnect();
    } catch (e) {}
    try {
      this.convolverNode.disconnect();
    } catch (e) {}
    try {
      this.wetGainNode.disconnect();
    } catch (e) {}
    try {
      this.internalOutputNode.disconnect();
    } catch (e) {}
    try {
      this.analyserNode.disconnect();
    } catch (e) {} // Анализатор может быть подключен к internalOutputNode

    let currentNode: AudioNode = this.inputNode;

    // --- Эквалайзер ---
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

    // --- Нормализация (Компрессор) ---
    if (settings.normalizationMode !== "off") {
      this.applyNormalizationSettings(settings.normalizationMode);
      currentNode.connect(this.compressorNode);
      currentNode = this.compressorNode;
    } else {
      // Если нормализация выключена, убедимся, что компрессор не влияет на сигнал
      // Можно сбросить его параметры или просто не подключать.
      // Здесь мы просто не подключаем его, если он не нужен.
    }

    // --- РЕВЕРБЕРАЦИЯ ---
    // Внимание: если реверберация включена, поток раздваивается.
    // Если выключена, поток идет напрямую.
    if (settings.reverbEnabled && this.convolverNode.buffer) {
      // Отключаем direct-path от предыдущего узла к internalOutputNode, если он был
      try {
        currentNode.disconnect(this.internalOutputNode);
      } catch (e) {}

      // Подключаем текущий узел (после эквалайзера/компрессора) к dry и wet ветвям
      currentNode.connect(this.dryGainNode);
      currentNode.connect(this.convolverNode);

      // Настраиваем гейны для dry/wet микса
      this.dryGainNode.gain.value = 1 - settings.reverbMix;
      this.wetGainNode.gain.value = settings.reverbMix;

      // Подключаем convolver к wetGainNode
      this.convolverNode.connect(this.wetGainNode);

      // Обе ветви (dry и wet) подключаются к internalOutputNode
      this.dryGainNode.connect(this.internalOutputNode);
      this.wetGainNode.connect(this.internalOutputNode);

      // Устанавливаем currentNode на internalOutputNode для дальнейших подключений
      currentNode = this.internalOutputNode;
    } else {
      // Если реверберация выключена или нет IR-файла, просто подключаем currentNode к internalOutputNode
      // Убедимся, что dry/wet гейны сброшены, чтобы не было остаточного эффекта
      if (this.dryGainNode) this.dryGainNode.gain.value = 1;
      if (this.wetGainNode) this.wetGainNode.gain.value = 0;
      currentNode.connect(this.internalOutputNode);
      currentNode = this.internalOutputNode;
    }

    // --- Анализатор волн ---
    // Анализатор всегда подключается к internalOutputNode, но его активность управляется settings.waveAnalyzerEnabled
    if (settings.waveAnalyzerEnabled) {
      // Если анализатор уже подключен к internalOutputNode, то ничего не делаем.
      // Если нет, то подключаем.
      // Простой способ: всегда отключать и подключать заново, чтобы избежать множественных подключений.
      try {
        this.internalOutputNode.disconnect(this.analyserNode);
      } catch (e) {}
      this.internalOutputNode.connect(this.analyserNode);
    } else {
      // Если анализатор выключен, отключаем его
      try {
        this.internalOutputNode.disconnect(this.analyserNode);
      } catch (e) {}
    }

    // --- Конечный выход ---
    // internalOutputNode всегда подключается к audioContext.destination
    try {
      this.internalOutputNode.disconnect(this.outputNode);
    } catch (e) {} // Отключаем, чтобы избежать дублирования
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

// Подписка на изменения в useAudioSettingsStore для обновления аудиографа
useAudioSettingsStore.subscribe((state, prevState) => {
  if (
    webAudioService.getAudioContext() &&
    webAudioService.getAudioContext()?.state !== "closed"
  ) {
    const equalizerGainsChanged = Object.keys(state.equalizerGains).some(
      (key) => state.equalizerGains[key] !== prevState.equalizerGains[key]
    );

   
    if (
      state.equalizerEnabled !== prevState.equalizerEnabled ||
      state.normalizationMode !== prevState.normalizationMode ||
      state.waveAnalyzerEnabled !== prevState.waveAnalyzerEnabled ||
      equalizerGainsChanged ||
      (state.activePresetName === "Custom" &&
        prevState.activePresetName !== "Custom") ||
      state.reverbEnabled !== prevState.reverbEnabled ||
      state.reverbMix !== prevState.reverbMix
    ) {
      webAudioService.applySettingsToGraph();
    }

    // Отдельная обработка для изменения размера комнаты, так как это асинхронная операция
    // и loadIRFile уже вызывает applySettingsToGraph после загрузки
    if (state.reverbRoomSize !== prevState.reverbRoomSize) {
    }
  }
});
