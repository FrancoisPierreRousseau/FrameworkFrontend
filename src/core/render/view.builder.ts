import { inject } from "inversify";
import { DOMBinder, Signal } from "./reactivity.ref";
import {
  IServiceCollection,
  ServicesColletion,
} from "../services/service.collection";
import { ICustomerElement } from "./register.component";
import { Renderer } from "./renderer";

// Doit être géré par un renderer
export class ElementRef<TElement extends Element> {
  constructor(public nativeElement: TElement) {}
}

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
    services: IServiceCollection | null = null,
    templateRef: TemplateRef
  ) {
    if (services) {
      this.injector.parent = services;
    }

    this.injector.bind(TemplateRef).toConstantValue(templateRef);
    return this.injector.get(ShadowView);
  }
}

export class TemplateRef {
  constructor(public element: DocumentFragment) {}
}

export interface IView {}

export class ShadowView implements IView {
  private renderer = new Renderer();

  constructor(
    @inject(ElementRef) elementRef: ElementRef<Element>,
    @inject(TemplateRef) templateRef: TemplateRef
  ) {
    const shadow = elementRef.nativeElement.attachShadow({ mode: "open" });
    const customerElement = shadow.host as unknown as ICustomerElement;
    const parent = shadow.host.getRootNode();
    const domBinder = new DOMBinder(this.renderer);

    if (parent instanceof ShadowRoot) {
      [...shadow.host.attributes].forEach((attr) => {
        if (attr.name in customerElement.component) {
          customerElement.component[attr.name] = (
            parent.host as unknown as ICustomerElement
          ).component[attr.value];
        }
      });
    }

    const childs = templateRef.element.querySelectorAll(":defined");

    if (childs.length > 0) {
      childs.forEach((child) => {
        if (child instanceof HTMLElement && child.hasAttribute("*for")) {
          const elementRef = new ElementRef(child);
          customerElement.services.bind(ElementRef).toConstantValue(elementRef);
          const list = customerElement.services.get(ListView);
          list.create(customerElement.component, domBinder);
        } else {
          domBinder.bind(child, customerElement.component);
        }
      });
    }

    shadow.appendChild(templateRef.element);
  }
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
