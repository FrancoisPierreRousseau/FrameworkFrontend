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
  bind(node: Node, expression: string | string[], component: any): void;
}

class TextNodeBinding implements DOMBindingStrategy {
  bind(node: Node, expressions: string[], component: any): void {
    const originalContent = node.textContent ?? "";

    const signals: Map<string, Signal<any>> = new Map();

    expressions.forEach((expression) => {
      const signalName = expression.slice(2, -2).trim();
      const parts = signalName.split(".");
      let current = component;

      for (const part of parts) {
        if (current && current[part] instanceof Signal) {
          const signal = current[part];
          signals.set(expression, signal);
          break;
        }
        current = current[part];
      }
    });

    const updateNode = () => {
      let content = originalContent ?? "";

      signals.forEach((signal, expression) => {
        const signalName = expression.slice(2, -2).trim();
        const parts = signalName.split(".");
        const value = this.getNestedValue(signal.get(), parts.slice(1));
        content = content.replaceAll(expression, String(value));
      });

      node.textContent = content;
    };

    signals.forEach((signal) => {
      signal.subscribe(updateNode);
    });

    updateNode();
  }

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, part) => current && current[part], obj);
  }
}

class AttributeBinding implements DOMBindingStrategy {
  bind(node: Node, expression: string, component: any): void {
    if (node instanceof HTMLElement) {
      const [attr, signalPath] = expression.split("=");
      const parts = signalPath.trim().split(".");
      let current = component;
      for (const part of parts) {
        if (current && current[part] instanceof Signal) {
          const signal = current[part];

          if (attr in node) {
            const updateProperty = () => {
              const value = this.getNestedValue(signal.get(), parts.slice(1));
              (node as any)[attr] = value;
            };
            signal.subscribe(updateProperty);
            updateProperty();
            return;
          } else {
            const update = () => {
              const value = this.getNestedValue(signal.get(), parts.slice(1));
              node.setAttribute(attr.trim(), String(value));
            };
            signal.subscribe(update);
            update();
          }
          return;
        }
        current = current[part];
      }
    }
  }

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, part) => current && current[part], obj);
  }
}

class ListBinding implements DOMBindingStrategy {
  bind(node: Node, expression: string, component: any): void {
    if (node instanceof HTMLElement) {
      const parts = expression.split(".");
      let current = component;
      for (const part of parts) {
        if (current && current[part] instanceof Signal) {
          const signal = current[part];
          const template = node.innerHTML;
          const updateList = () => {
            const array = signal.get();
            if (Array.isArray(array)) {
              node.innerHTML = array
                .map((item, index) => this.interpolate(template, item, index))
                .join("");
            }
          };
          signal.subscribe(updateList);
          updateList();
          return;
        }
        current = current[part];
      }
    }
  }

  private interpolate(template: string, item: any, index: number): string {
    return template.replace(/{{(.*?)}}/g, (match, p1) => {
      const value =
        p1.trim() === "$index"
          ? index
          : this.getNestedValue(item, p1.trim().split("."));
      return String(value);
    });
  }

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, part) => current && current[part], obj);
  }
}

export class DOMBinder {
  private strategy: DOMBindingStrategy = new TextNodeBinding();
  private attrStrategy: DOMBindingStrategy = new AttributeBinding();
  private listStrategy: DOMBindingStrategy = new ListBinding();

  bind(element: HTMLElement, component: any): void {
    this.bindTextNodes(element, component);
    this.bindAttributes(element, component);
    this.bindLists(element, component);
  }

  bindTextNodes(element: HTMLElement, component: any): void {
    const signalRegex = /{{(.*?)}}/g;
    const textNodes = [...element.childNodes].filter(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        signalRegex.test(node.textContent || "")
    );

    textNodes.forEach((node) => {
      const expressions = node.textContent!.match(signalRegex);
      this.strategy.bind(node, expressions ?? [], component);
    });
  }

  private bindAttributes(element: HTMLElement, component: any): void {
    const signalRegex = /\[(.*?)\]/;
    [...element.attributes].forEach((attr) => {
      const match = attr.name.match(signalRegex);
      if (match) {
        const expression = `${attr.name.slice(1, -1)}=${attr.value}`;
        this.attrStrategy.bind(element, expression, component);
        element.removeAttribute(attr.name);
      }
    });
  }

  private bindLists(element: HTMLElement, component: any): void {
    const hasFor =
      element.attributes &&
      Array.from(element.attributes).some((attr) => attr.name === "*for");

    if (hasFor && element instanceof HTMLElement) {
      const forAttr = element.getAttribute("*for");
      if (forAttr) {
        this.listStrategy.bind(element, forAttr, component);
        element.removeAttribute("*for");
      }
    }
  }
}

export function signal<T>(initialValue: T): Signal<T> {
  return new Signal<T>(initialValue);
}
