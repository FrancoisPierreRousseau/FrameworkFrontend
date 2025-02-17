import { inject } from "inversify";
import { DOMBinder, Signal } from "./reactivity.ref";
import {
  IServiceCollection,
  ServicesColletion,
} from "../services/service.collection";
import { ElementRef } from "../components/component";
import { ICustomerElement } from "./register.component";
import { Renderer } from "./renderer";

export class ViewFactory {
  private injector = new ServicesColletion();

  constructor(private component: any, private domBinder: DOMBinder) {}

  createEmbededView(node: Element | DocumentFragment, context: any) {
    const childs = node.querySelectorAll(":defined");

    if (childs.length > 0) {
      childs.forEach((child) => {
        if (child instanceof HTMLElement && child.hasAttribute("*for")) {
          const elementRef = new ElementRef(child);
          this.injector.bind(ElementRef).toConstantValue(elementRef);
          const list = this.injector.get(ListView);
          list.create(context, this.domBinder);
        } else {
          this.domBinder.bind(child, context);
        }
      });
    }
  }

  createView(
    node: Element | DocumentFragment,
    services: IServiceCollection | null = null
  ) {
    if (services) {
      this.injector.parent = services;
    }

    const childs = node.querySelectorAll(":defined");

    if (childs.length > 0) {
      childs.forEach((child) => {
        if (child instanceof HTMLElement && child.hasAttribute("*for")) {
          const elementRef = new ElementRef(child);
          this.injector.bind(ElementRef).toConstantValue(elementRef);
          const list = this.injector.get(ListView);
          list.create(this.component, this.domBinder);
        } else {
          this.domBinder.bind(child, this.component);
        }
      });
    }
  }
}

class ShadowView {
  private renderer = new Renderer();

  constructor(
    @inject(ElementRef) private elementRef: ElementRef<Element>,
    @inject(ViewFactory) private viewFactory: ViewFactory
  ) {
    const shadow = elementRef.nativeElement.attachShadow({ mode: "open" });
    const component = (shadow.host as unknown as ICustomerElement).component;
    const parent = shadow.host.getRootNode();
    const domBinder = new DOMBinder(this.renderer);

    if (parent instanceof ShadowRoot) {
      [...shadow.host.attributes].forEach((attr) => {
        if (attr.name in component) {
          component[attr.name] = (
            parent.host as unknown as ICustomerElement
          ).component[attr.value];
        }
      });
    }
  }
}

class EmbededView {
  private renderer: Renderer = new Renderer();

  constructor() {
    const domBinder = new DOMBinder(this.renderer);
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

// a deplacer dans un dossiers directive (et faire reference dans l'injecteur à des interfaces). Peut être cela resoudra le probléme d'initialisation
export class ListView {
  private template: string;
  private forAttr: string;

  constructor(
    @inject(ElementRef) private elementRef: ElementRef<HTMLElement>,
    @inject(ViewFactory) private viewFactory: ViewFactory
  ) {
    this.template = elementRef.nativeElement.innerHTML;
    this.forAttr = elementRef.nativeElement.getAttribute("*for") || "";
    elementRef.nativeElement.removeAttribute("*for");
  }

  create(component: any, domBinder: DOMBinder): Node {
    const signal = component[this.forAttr];

    if (signal instanceof Signal) {
      const update = () => {
        this.elementRef.nativeElement.innerHTML = "";

        signal.get().forEach((item: any) => {
          const templateElement = document.createElement("template");
          templateElement.innerHTML = this.template;

          this.viewFactory.createEmbededView(templateElement.content, {
            ...component,
            ...item,
          });

          domBinder.bind(templateElement.content, { ...component, ...item });

          this.elementRef.nativeElement.appendChild(templateElement.content);
        });
      };
      signal.subscribe(update);
      update();
    }

    return this.elementRef.nativeElement;
  }
}

export class ViewContainer {
  constructor(@inject(ViewFactory) private viewFactory: ViewFactory) {}

  createViewComponent(services: IServiceCollection) {}
}
