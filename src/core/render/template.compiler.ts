import { ForDirective } from "../directives/for.directive";
import { IInjector, Injector } from "../services/injector";
import { Signal } from "./reactivity.ref";
import { EventKey, Renderer } from "./renderer";
import { ElementRef, TemplateRef, ViewFactory } from "./view.builder";

export interface CompiledTemplate {
  template: DocumentFragment;
  bindings: BindingInstruction[];
}

export function createTemplateRef(raw: string): TemplateRef {
  return new TemplateRef(raw);
}

export type BindingInstruction =
  | {
      type: "text";
      node: Text;
      expressions: RegExpMatchArray;
      bind(component: any): void;
    }
  | {
      type: "attr";
      node: Element;
      attr: string;
      expression: string;
      bind(component: any): void;
    }
  | {
      type: "event";
      node: HTMLElement;
      event: string;
      handler: string;
      bind(component: any, renderer: Renderer): void;
    }
  | {
      type: "directive";
      node: Element;
      directive: string;
      expression: string;
      bind(services: IInjector, context: any): void;
    };

// Cela ne doit pas prendre un Raw mais un templateRef
export function compileTemplate(
  templateRef: TemplateRef
): BindingInstruction[] {
  const fragment = templateRef.element as DocumentFragment;

  const bindings: BindingInstruction[] = [];

  const getNestedValue = (obj: any, path: string[]): any =>
    path.reduce((current, part) => current && current[part], obj);

  const walk = (node: Node) => {
    if (
      node.nodeType === Node.TEXT_NODE &&
      /{{(.*?)}}/.test(node.textContent || "")
    ) {
      bindings.push({
        type: "text",
        node: node as Text,
        expressions: node.textContent!.match(/{{(.*?)}}/g)!,
        bind(component: any) {
          const originalContent = this.node.textContent ?? "";
          const signals: Map<string, Signal<any>> = new Map();
          const statiqueValues: Map<string, string> = new Map();

          this.expressions.forEach((expression) => {
            const signalName = expression.slice(2, -2).trim();
            const parts = signalName.split(".");
            let current = component;

            for (const part of parts) {
              if (current && current[part] instanceof Signal) {
                const signal = current[part];
                signals.set(expression, signal);
                break;
              } else if (
                current &&
                typeof current === "object" &&
                !Array.isArray(current)
              ) {
                const value = current[part];
                statiqueValues.set(expression, String(value));
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
              const value = getNestedValue(signal.get(), parts.slice(1));
              content = content.replaceAll(expression, String(value));
            });

            statiqueValues.forEach((value, expression) => {
              content = content.replaceAll(expression, value);
            });

            this.node.textContent = content;
          };

          signals.forEach((signal) => {
            signal.subscribe(updateNode);
          });

          updateNode();
        },
      });
    }

    if (node instanceof HTMLElement) {
      [...node.attributes].forEach((attr) => {
        if (attr.name.startsWith("[")) {
          bindings.push({
            type: "attr",
            node,
            attr: attr.name.slice(1, -1),
            expression: attr.value,
            bind(component: any) {
              const parts = this.expression.trim().split(".");
              let current = component;
              for (const part of parts) {
                if (current && current[part] instanceof Signal) {
                  const signal = current[part];

                  if (this.attr in this.node) {
                    const updateProperty = () => {
                      const value = getNestedValue(
                        signal.get(),
                        parts.slice(1)
                      );
                      (this.node as any)[this.attr] = value;
                    };
                    signal.subscribe(updateProperty);
                    updateProperty();
                    return;
                  } else {
                    const update = () => {
                      const value = getNestedValue(
                        signal.get(),
                        parts.slice(1)
                      );
                      this.node.setAttribute(this.attr.trim(), String(value));
                    };
                    signal.subscribe(update);
                    update();
                  }
                  return;
                }
                current = current[part];
              }

              this.node.removeAttributeNode(attr);
            },
          });
        } else if (attr.name.startsWith("(")) {
          bindings.push({
            type: "event",
            node,
            event: attr.name.slice(1, -1),
            handler: attr.value,
            bind(component: any, renderer: Renderer) {
              if (
                !(this.handler in component) ||
                typeof component[this.handler] !== "function"
              ) {
                throw new Error("Method not found or invalid in the component");
              }

              renderer.listen(
                this.node,
                this.event as EventKey,
                component[this.handler].bind(component)
              );

              this.node.removeAttributeNode(attr);
            },
          });
        } else if (attr.name.startsWith("*")) {
          bindings.push({
            type: "directive",
            node,
            directive: attr.name,
            expression: attr.value,
            bind(injector: Injector, context: any) {
              const template = `<template>${this.node.innerHTML}</template>`;
              const templateRef = createTemplateRef(template);

              if (this.node.hasAttribute("*for")) {
                this.node.innerHTML = "";
                const elementRef = new ElementRef(this.node);

                const localInjector = new Injector();
                localInjector.parent = injector;
                const viewFactory = new ViewFactory(
                  elementRef,
                  context,
                  localInjector
                );
                localInjector.bind(ViewFactory).toConstantValue(viewFactory);
                localInjector.bind(TemplateRef).toConstantValue(templateRef);
                localInjector.bind(ElementRef).toConstantValue(elementRef);
                const list = localInjector.get(ForDirective);

                const signal = context[this.node.getAttribute("*for") || ""];
                if (signal instanceof Signal) {
                  signal.subscribe(list.apply.bind(list));
                  list.apply(signal.get());
                }
              }

              this.node.removeAttributeNode(attr);
            },
          });
        }
      });
    }

    node.childNodes.forEach(walk);
  };

  walk(fragment);

  return bindings;
}
