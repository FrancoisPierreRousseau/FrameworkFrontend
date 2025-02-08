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
    if (this.value !== newValue) {
      this.value = newValue;
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
    if (expression in component && component[expression] instanceof Signal) {
      const signal = component[expression];
      const text = node.textContent || "";
      const updateNode = () => {
        node.textContent = text.replace(`{{${expression}}}`, signal.get());
      };
      signal.subscribe(updateNode);
      updateNode();
    }
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
      const signalNames = node.textContent!.match(signalRegex);
      signalNames?.forEach((signalName) => {
        const expression = signalName.slice(2, -2).trim();
        this.strategy.bind(node, expression, component);
      });
    });
  }
}

export function signal<T>(initialValue: T): Signal<T> {
  return new Signal<T>(initialValue);
}
