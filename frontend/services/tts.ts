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

type Defaults = Required<Pick<SayOptions, "rate" | "pitch" | "language">> & {
  voice?: string;
};

const DEFAULTS: Defaults = {
  rate: 1.0,
  pitch: 1.0,
  language: "en-US",
  voice: undefined,
};

let mode: TtsMode = "onDemand";
let defaults: Defaults = { ...DEFAULTS };

function clean(text: string) {
  return (text ?? "").trim();
}

function speakInternal(text: string, opts: SayOptions = {}) {
  const cleaned = clean(text);
  if (!cleaned) return;

  const interrupt = opts.interrupt ?? true;
  if (interrupt) Speech.stop();

  Speech.speak(cleaned, {
    rate: opts.rate ?? defaults.rate,
    pitch: opts.pitch ?? defaults.pitch,
    language: opts.language ?? defaults.language,
    voice: opts.voice ?? defaults.voice,
    onStart: opts.onStart,
    onDone: opts.onDone,
    onError: opts.onError,
  });
}

export const tts = {
  setMode(next: TtsMode) {
    mode = next;
    if (mode === "off") Speech.stop();
  },
  getMode() {
    return mode;
  },

  setDefaults(next: Partial<Defaults>) {
    defaults = { ...defaults, ...next };
  },
  getDefaults() {
    return { ...defaults };
  },

  say(text: string, opts: SayOptions = {}) {
    if (mode === "off") return;
    speakInternal(text, opts);
  },

  autoSay(text: string, opts: SayOptions = {}) {
    if (mode !== "auto") return;
    speakInternal(text, opts);
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
    if (mode === "off") return;

    const filtered = (lines ?? []).map(clean).filter(Boolean);
    if (!filtered.length) return;

    const interrupt = opts.interrupt ?? true;
    if (interrupt) Speech.stop();

    let i = 0;
    const speakNext = () => {
      const line = filtered[i++];
      if (!line) return;

      Speech.speak(line, {
        rate: opts.rate ?? defaults.rate,
        pitch: opts.pitch ?? defaults.pitch,
        language: opts.language ?? defaults.language,
        voice: opts.voice ?? defaults.voice,
        onStart: i === 1 ? opts.onStart : undefined,
        onDone: i < filtered.length ? speakNext : opts.onDone,
        onError: opts.onError,
      });
    };

    speakNext();
  },

  autoMany(lines: string[], opts: SayOptions = {}) {
    if (mode !== "auto") return;
    this.sayMany(lines, opts);
  },
};