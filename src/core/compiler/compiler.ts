import { DOMBinder } from "../render/reactivity.ref";
import { EventKey, Renderer } from "../render/renderer";

interface ElementVisitor {
  visitElement(element: HTMLElement): void;
}

class VisitorElement implements ElementVisitor {
  private readonly visitors: ElementVisitor[] = [];

  add(visitor: ElementVisitor) {
    this.visitors.push(visitor);
  }

  visitElement(element: HTMLElement): void {
    this.visitors.forEach((visitor) => visitor.visitElement(element));
  }
}

class ReactivityVisitor implements ElementVisitor {
  constructor(private component: any, private domBinder: DOMBinder) {}

  visitElement(element: HTMLElement): void {
    this.domBinder.bind(element, this.component);
  }
}

class BindingEventVisitor implements ElementVisitor {
  private readonly eventRegex = /^\(.*\)$/;

  constructor(
    private readonly component: any,
    private readonly renderer: Renderer
  ) {}

  visitElement(element: HTMLElement): void {
    const attrEvents = [...element.attributes].filter((attr) =>
      this.eventRegex.test(attr.localName)
    );

    attrEvents.forEach((attr) => {
      const event = attr.localName.slice(1, attr.localName.length - 1);
      const method = attr.value;

      if (
        !(method in this.component) ||
        typeof this.component[method] !== "function"
      ) {
        throw new Error("Method not found or invalid in the component");
      }

      this.renderer.listen(
        element as HTMLElement,
        event as EventKey,
        this.component[method].bind(this.component)
      );

      element.removeAttributeNode(attr);
    });
  }
}

export class Compiler {
  constructor(
    private readonly componentTemplate: DocumentFragment,
    private readonly component: any,
    private readonly renderer: Renderer
  ) {}

  compile() {
    const visitor = new VisitorElement();
    visitor.add(new BindingEventVisitor(this.component, this.renderer));
    // visitor.add(new ReactivityVisitor(this.component, new DOMBinder()));

    this.traverseAndVisit(this.componentTemplate, visitor);

    return this.componentTemplate;
  }

  private traverseAndVisit(node: Node, visitor: ElementVisitor): void {
    if (node instanceof HTMLElement && node.matches(":defined")) {
      visitor.visitElement(node);
    }

    node.childNodes.forEach((child) => this.traverseAndVisit(child, visitor));
  }
}
