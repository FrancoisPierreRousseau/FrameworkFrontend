import { ComponentTemplate } from "../components/component";
import { EventKey, Renderer } from "../render/renderer";

interface ElementVisitor {
  visitElement(element: Element): void;
}

class EventHandlerVisitor implements ElementVisitor {
  constructor(
    private readonly component: any,
    private readonly renderer: Renderer
  ) {}

  visitElement(element: Element): void {
    const attrEvents = [...element.attributes].filter((attr) =>
      /^\(.*\)$/.test(attr.localName)
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
    private readonly componentTemplate: ComponentTemplate,
    private readonly component: any,
    private readonly renderer: Renderer
  ) {}

  compile() {
    const parser = new DOMParser();
    const element = parser
      .parseFromString(this.componentTemplate.template, "text/html")
      .querySelector("template");

    if (!element) {
      throw new Error("un probléme");
    }

    const visitor = new EventHandlerVisitor(this.component, this.renderer);

    this.traverseAndVisit(element.content, visitor);

    return element.content;
  }

  private traverseAndVisit(node: Node, visitor: ElementVisitor): void {
    if (node instanceof Element && node.matches(":defined")) {
      visitor.visitElement(node);
    }

    node.childNodes.forEach((child) => this.traverseAndVisit(child, visitor));
  }
}
