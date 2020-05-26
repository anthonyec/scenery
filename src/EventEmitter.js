import { createNanoEvents } from "nanoevents";

export default class EventEmitter {
  constructor() {
    this.emitter = createNanoEvents();
  }

  emit(event, ...args) {
    this.emitter.emit(event, ...args);
  }

  on(event, callback) {
    return this.emitter.on(event, callback);
  }
}
