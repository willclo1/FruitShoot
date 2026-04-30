import { tts } from "./tts";

type Listener = (state: {
  playing: boolean;
  index: number;
  total: number;
  line?: string;
}) => void;

let listeners: Listener[] = [];

let playing = false;
let index = 0;
let total = 0;
let lines: string[] = [];

function emit() {
  const state = { playing, index, total, line: lines[index - 1] };
  listeners.forEach((l) => l(state));
}

export const ttsController = {
  playLines(nextLines: string[], opts: { rate?: number; pitch?: number } = {}) {
    if (!nextLines || !nextLines.length) return;
    // stop any existing playback
    this.stop();

    lines = nextLines.map((l) => (l ?? "").trim()).filter(Boolean);
    total = lines.length;
    index = 0;
    playing = true;
    emit();

    const playNext = () => {
      if (!playing) return;
      const line = lines[index++];
      if (!line) {
        playing = false;
        emit();
        return;
      }

      tts.say(line, {
        interrupt: false,
        rate: opts.rate,
        pitch: opts.pitch,
        onStart: () => emit(),
        onDone: () => {
          if (index < total) playNext();
          else {
            playing = false;
            emit();
          }
        },
        onError: () => {
          playing = false;
          emit();
        },
      });
    };

    playNext();
  },

  stop() {
    playing = false;
    index = 0;
    total = 0;
    lines = [];
    tts.stop();
    emit();
  },

  pause() {
    // expo-speech may support pause; try best-effort
    // @ts-ignore
    tts.pause?.();
    playing = false;
    emit();
  },

  resume() {
    // @ts-ignore
    tts.resume?.();
    // Note: resume may not continue sequence; keep state playing for UI
    playing = true;
    emit();
  },

  subscribe(fn: Listener) {
    listeners.push(fn);
    // emit current state immediately
    fn({ playing, index, total, line: lines[index - 1] });
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  getState() {
    return { playing, index, total, line: lines[index - 1] };
  },
};

export default ttsController;
