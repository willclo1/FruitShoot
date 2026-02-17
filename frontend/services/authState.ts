type Listener = (authed: boolean) => void;

let authed = false;
const listeners = new Set<Listener>();

export function getAuthed() {
  return authed;
}

export function setAuthed(next: boolean) {
  authed = next;
  listeners.forEach((l) => l(authed));
}

export function subscribeAuthed(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener); 
  };
}