import * as Speech from "expo-speech";

export type TtsMode = "off" | "onDemand" | "auto";

export type SayOptions = {
  interrupt?: boolean;
  rate?: number;
  pitch?: number;
  language?: string;
  voice?: string;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (e: unknown) => void;
};

const DEFAULTS: Required<Pick<SayOptions, "rate" | "pitch" | "language">> = {
  rate: 1.0,
  pitch: 1.0,
  language: "en-US",
};

let mode: TtsMode = "onDemand";

export const tts = {
  setMode(next: TtsMode) {
    mode = next;
  },
  getMode() {
    return mode;
  },

  say(text: string, opts: SayOptions = {}) {
    const cleaned = (text ?? "").trim();
    if (!cleaned) return;
    if (mode === "off") return;

    const interrupt = opts.interrupt ?? true;
    if (interrupt) Speech.stop();

    Speech.speak(cleaned, {
      rate: opts.rate ?? DEFAULTS.rate,
      pitch: opts.pitch ?? DEFAULTS.pitch,
      language: opts.language ?? DEFAULTS.language,
      voice: opts.voice || undefined,
      onStart: opts.onStart,
      onDone: opts.onDone,
      onError: opts.onError,
    });
  },

  stop() {
    Speech.stop();
  },

  pause() {
    // @ts-ignore
    Speech.pause?.();
  },

  resume() {
    // @ts-ignore
    Speech.resume?.();
  },

  sayIf(condition: boolean, text: string, opts?: SayOptions) {
    if (condition) this.say(text, opts);
  },

  sayMany(lines: string[], opts: SayOptions = {}) {
    const filtered = lines.map((s) => (s ?? "").trim()).filter(Boolean);
    if (!filtered.length) return;

    const interrupt = opts.interrupt ?? true;
    if (interrupt) Speech.stop();

    let i = 0;
    const speakNext = () => {
      const line = filtered[i++];
      if (!line) return;
      Speech.speak(line, {
        rate: opts.rate ?? DEFAULTS.rate,
        pitch: opts.pitch ?? DEFAULTS.pitch,
        language: opts.language ?? DEFAULTS.language,
        voice: opts.voice || undefined,
        onStart: i === 1 ? opts.onStart : undefined,
        onDone: i < filtered.length ? speakNext : opts.onDone,
        onError: opts.onError,
      });
    };

    speakNext();
  },
};