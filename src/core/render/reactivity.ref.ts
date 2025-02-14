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

interface DOMBindingStrategy {
  bind(node: Node, expression: string | string[], component: any): void;
}

abstract class BaseNodeBinding {
  protected getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, part) => current && current[part], obj);
  }
}

class EventNodeBinding implements DOMBindingStrategy {
  private readonly eventRegex = /^\(.*\)$/;

  constructor(private renderer: Renderer) {}

  bind(element: HTMLElement, expression: string[], component: any): void {
    const attrEvents = [...element.attributes].filter((attr) =>
      this.eventRegex.test(attr.localName)
    );

    attrEvents.forEach((attr) => {
      const event = attr.localName.slice(1, attr.localName.length - 1);
      const method = attr.value;

      if (!(method in component) || typeof component[method] !== "function") {
        throw new Error("Method not found or invalid in the component");
      }

      this.renderer.listen(
        element as HTMLElement,
        event as EventKey,
        component[method].bind(component)
      );

      element.removeAttributeNode(attr);
    });
  }
}

class TextNodeBinding extends BaseNodeBinding implements DOMBindingStrategy {
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
        if (current) {
          current = current[part];
        }
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
}

class AttributeBinding extends BaseNodeBinding implements DOMBindingStrategy {
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
}

export class DOMBinder {
  private strategy: DOMBindingStrategy = new TextNodeBinding();
  private attrStrategy: DOMBindingStrategy = new AttributeBinding();
  private eventStrategy: DOMBindingStrategy;

  constructor(renderer: Renderer) {
    this.eventStrategy = new EventNodeBinding(renderer);
  }

  bind(node: Node, component: any): void {
    this.bindTextNodes(node, component);
    this.bindAttributes(node, component);
    this.bindEvents(node, component);
  }

  bindTextNodes(node: Node, component: any): void {
    const signalRegex = /{{(.*?)}}/g;
    let textNodes: ChildNode[] = [];

    textNodes = [...node.childNodes].filter((node) =>
      signalRegex.test(node.textContent || "")
    );

    textNodes.forEach((node) => {
      const expressions = node.textContent!.match(signalRegex);
      this.strategy.bind(node, expressions ?? [], component);
    });

    node.childNodes.forEach((node) => this.bindTextNodes(node, component));
  }

  private bindAttributes(element: Node, component: any): void {
    const signalRegex = /\[(.*?)\]/;

    if (element instanceof HTMLElement) {
      [...element.attributes].forEach((attr) => {
        const match = attr.name.match(signalRegex);
        if (match) {
          const expression = `${attr.name.slice(1, -1)}=${attr.value}`;
          this.attrStrategy.bind(element, expression, component);
          element.removeAttribute(attr.name);
        }
      });
    }

    element.childNodes.forEach((node) => this.bindAttributes(node, component));
  }

  private bindEvents(element: Node, component: any): void {
    if (element instanceof HTMLElement) {
      this.eventStrategy.bind(element, [], component);
    }

    element.childNodes.forEach((node) => this.bindEvents(node, component));
  }
}

export function signal<T>(initialValue: T): Signal<T> {
  return new Signal<T>(initialValue);
}
