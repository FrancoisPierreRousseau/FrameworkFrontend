import cloneDeep from "lodash.clonedeep";
import isEqual from "lodash.isequal";
import { EventKey, Renderer } from "./renderer";

export class Signal<T> {
  private value: T;
  private observers: Set<(value: T) => void> = new Set();

  constructor(initialValue: T) {
    this.value = cloneDeep(initialValue);
  }

  get(): T {
    return this.value;
  }

  set(newValue: T) {
    if (!isEqual(newValue, this.value)) {
      this.value = cloneDeep(newValue);
      this.notifyObservers();
    }
  }

  update(fn: (currentValue: T) => T): void {
    const newValue = fn(cloneDeep(this.value));
    this.value = cloneDeep(newValue);
    this.notifyObservers();
  }

  subscribe(observer: (value: T) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  private notifyObservers(): void {
    this.observers.forEach((observer) => observer(this.value));
  }
}

export function signal<T>(initialValue: T): Signal<T> {
  return new Signal<T>(initialValue);
}
