import cloneDeep from "lodash.clonedeep";
import isEqual from "lodash.isequal";

class Signal<T> {
  private value: T;

  private observers: Set<(value: T) => void> = new Set();

  constructor(initialValue: T) {
    this.value = initialValue;
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
    this.set(fn(this.value));
  }

  subscribe(observer: (value: T) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  private notifyObservers(): void {
    this.observers.forEach((observer) => observer(this.value));
  }
}

interface DOMBindingStrategy {
  bind(node: Node, expression: string, component: any): void;
}

class TextNodeBinding implements DOMBindingStrategy {
  bind(node: Node, expression: string, component: any): void {
    const signalName = expression.slice(2, -2).trim();
    const parts = signalName.split(".");
    let current = component;
    for (const part of parts) {
      if (current && current[part] instanceof Signal) {
        const signal = current[part];
        const index = (node.textContent || "").split(" ").indexOf(expression);
        const updateNode = () => {
          const textParts = (node.textContent || "").split(" ");
          const value = this.getNestedValue(signal.get(), parts.slice(1));
          textParts[index] = String(value);
          node.textContent = textParts.join(" ");
        };
        signal.subscribe(updateNode);
        updateNode();
        return;
      }
      current = current[part];
    }
  }

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, part) => current && current[part], obj);
  }
}

export class DOMBinder {
  private strategy: DOMBindingStrategy = new TextNodeBinding();

  bind(element: HTMLElement, component: any): void {
    const signalRegex = /{{(.*?)}}/g;
    const textNodes = [...element.childNodes].filter(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        signalRegex.test(node.textContent || "")
    );

    textNodes.forEach((node) => {
      const expressions = node.textContent!.match(signalRegex);
      expressions?.forEach((expression) => {
        this.strategy.bind(node, expression, component);
      });
    });
  }
}

export function signal<T>(initialValue: T): Signal<T> {
  return new Signal<T>(initialValue);
}
