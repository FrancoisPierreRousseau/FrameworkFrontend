import { inject } from "inversify";
import { DOMBinder, Signal } from "./reactivity.ref";
import {
  IServiceCollection,
  ServicesColletion,
} from "../services/service.collection";
import { ElementRef } from "../components/component";

export class ViewFactory {
  injector = new ServicesColletion();

  createView(
    node: Element | DocumentFragment,
    services: IServiceCollection | null = null
  ): IView {
    if (services) {
      this.injector.parent = services;
    }

    const compositeView = new CompositeView(node);
    const childs = node.querySelectorAll(":defined");

    if (childs.length > 0) {
      childs.forEach((child) => {
        if (child instanceof HTMLElement && child.hasAttribute("*for")) {
          const elementRef = new ElementRef(child);
          this.injector.bind(ElementRef).toConstantValue(elementRef);

          compositeView.addChild(this.injector.get(ListView));
        } else {
          compositeView.addChild(new SimpleView(child));
        }
      });
    }

    return compositeView;
  }
}

interface IView {
  create(component: any, domBinder: DOMBinder): Node;
}

class TemplateRef {
  constructor(public element: HTMLElement) {}
}

abstract class AbstractView implements IView {
  protected element: Node;

  constructor(element: Node) {
    this.element = element;
  }

  abstract create(component: any, domBinder: DOMBinder): Node;
}

class SimpleView extends AbstractView {
  create(component: any, domBinder: DOMBinder): Node {
    domBinder.bind(this.element, component);
    return this.element;
  }
}

export class ListView extends AbstractView {
  private template: string;
  private forAttr: string;

  constructor(
    @inject(ElementRef) private elementRef: ElementRef<HTMLElement>,
    @inject(ViewFactory) private viewFactory: ViewFactory
  ) {
    super(elementRef.nativeElement);
    this.template = elementRef.nativeElement.innerHTML;
    this.forAttr = elementRef.nativeElement.getAttribute("*for") || "";
    elementRef.nativeElement.removeAttribute("*for");
  }

  create(component: any, domBinder: DOMBinder): Node {
    const signal = component[this.forAttr];

    if (signal instanceof Signal) {
      const update = () => {
        (this.element as HTMLElement).innerHTML = "";

        signal.get().forEach((item: any) => {
          const templateElement = document.createElement("template");
          templateElement.innerHTML = this.template;

          const view = this.viewFactory.createView(templateElement.content);
          const node = view.create({ ...component, ...item }, domBinder);
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

  create(component: any, domBinder: DOMBinder): Node {
    this.children.forEach((child) => child.create(component, domBinder));
    return this.element;
  }
}
