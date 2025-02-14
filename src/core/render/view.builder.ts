import { DOMBinder, Signal } from "./reactivity.ref";

interface IView {
  create(component: any): Node;
}

abstract class AbstractView implements IView {
  protected element: Node;

  constructor(element: Node) {
    this.element = element;
  }

  abstract create(component: any): Node;
}

class SimpleView extends AbstractView {
  create(component: any): Node {
    const domBinder = new DOMBinder();

    domBinder.bind(this.element, component);
    return this.element;
  }
}

class ListView extends AbstractView {
  private template: string;
  private forAttr: string;

  constructor(element: HTMLElement) {
    super(element);
    this.template = element.innerHTML;
    this.forAttr = element.getAttribute("*for") || "";
    element.removeAttribute("*for");
  }

  create(component: any): Node {
    const signal = component[this.forAttr];
    const domBinder = new DOMBinder();

    if (signal instanceof Signal) {
      const update = () => {
        (this.element as HTMLElement).innerHTML = "";
        signal.get().forEach((item: any) => {
          const templateElement = document.createElement("template");
          templateElement.innerHTML = this.template;
          const builder = new ViewBuilder(templateElement.content);
          const node = builder.create(component);
          domBinder.bind(node, { ...component, ...item });
          this.element.appendChild(node);
        });
      };
      signal.subscribe(update);
      update();
    }

    return this.element;
  }
}

class CompositeView extends AbstractView {
  private children: IView[] = [];

  addChild(child: IView) {
    this.children.push(child);
  }

  create(component: any): Node {
    this.children.forEach((child) => child.create(component));
    return this.element;
  }
}

class ViewFactory {
  static createView(node: Node): IView {
    if (node instanceof HTMLElement && node.hasAttribute("*for")) {
      return new ListView(node);
    } else if (
      (node instanceof HTMLElement || node instanceof DocumentFragment) &&
      node.querySelectorAll(":defined").length > 0
    ) {
      const compositeView = new CompositeView(node);
      node.querySelectorAll(":defined").forEach((child) => {
        compositeView.addChild(this.createView(child));
      });
      return compositeView;
    } else {
      return new SimpleView(node);
    }
  }
}

export class ViewBuilder {
  private rootView: IView;

  constructor(template: DocumentFragment) {
    this.rootView = ViewFactory.createView(template);
  }

  create(component: any): Node {
    return this.rootView.create(component);
  }
}
