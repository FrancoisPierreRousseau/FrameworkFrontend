export type EventKey = keyof HTMLElementEventMap;

// Gérera les risques d'injection XSS ect....
export class Renderer {
  listen<K extends EventKey>(
    element: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ) {
    element.addEventListener(type, listener, options);
  }
}
