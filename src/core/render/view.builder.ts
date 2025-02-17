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

let injector = new ServicesColletion();
let component: any;
const CONTEXT_TOKEN = Symbol.for("CONTEXT_TOKEN");

export class ViewFactory {
  private injector = new ServicesColletion();

  constructor(private component: any, private domBinder: DOMBinder) {}

  createEmbededView(templateRef: TemplateRef, context: any) {
    this.injector.bind(TemplateRef).toConstantValue(templateRef);
    component = this.component;
    injector = this.injector;
    injector
      .bind(CONTEXT_TOKEN)
      .toConstantValue({ ...context, ...this.component });

    injector.get(EmbededView);
  }

  createView(
    services: IServiceCollection | null = null,
    templateRef: TemplateRef
  ) {
    if (services) {
      this.injector.parent = services;
    }

    this.injector.bind(TemplateRef).toConstantValue(templateRef);
    this.injector.bind(CONTEXT_TOKEN).toConstantValue(this.component);

    injector = this.injector;

    return this.injector.get(ShadowView);
  }
}

export class TemplateRef {
  constructor(public element: DocumentFragment) {}
}

export interface IView {}

export class EmbededView {
  private renderer = new Renderer();

  constructor(
    @inject(ElementRef) elementRef: ElementRef<Element>,
    @inject(TemplateRef) templateRef: TemplateRef,
    @inject(CONTEXT_TOKEN) context: any
  ) {
    const childs = templateRef.element.querySelectorAll(":defined");
    const domBinder = new DOMBinder(this.renderer);

    if (childs.length > 0) {
      childs.forEach((child) => {
        if (child instanceof HTMLElement && child.hasAttribute("*for")) {
          const elementRef = new ElementRef(child);
          injector.bind(ElementRef).toConstantValue(elementRef);
          const list = injector.get(ListView);
          list.create(component[child.getAttribute("*for") || ""], domBinder);
        } else {
          domBinder.bind(child, context);
        }
      });

      elementRef.nativeElement.appendChild(templateRef.element);
    }
  }
}

export class ShadowView implements IView {
  private renderer = new Renderer();

  constructor(
    @inject(ElementRef) elementRef: ElementRef<Element>,
    @inject(TemplateRef) templateRef: TemplateRef,
    @inject(CONTEXT_TOKEN) context: any
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
          injector.bind(ElementRef).toConstantValue(elementRef);
          const list = injector.get(ListView);
          list.create(
            customerElement.component[child.getAttribute("*for") || ""],
            domBinder
          );
          child.removeAttribute("*for");
        } else {
          domBinder.bind(child, context);
        }
      });
    }

    shadow.appendChild(templateRef.element);
  }
}

// a deplacer dans un dossiers directive (et faire reference dans l'injecteur à des interfaces). Peut être cela resoudra le probléme d'initialisation
export class ListView {
  private template: string;

  constructor(
    @inject(ElementRef) private elementRef: ElementRef<HTMLElement>,
    @inject(ViewFactory) private viewFactory: ViewFactory
  ) {
    this.template = elementRef.nativeElement.innerHTML;
  }

  create(signal: any, domBinder: DOMBinder): Node {
    if (signal instanceof Signal) {
      const update = () => {
        this.elementRef.nativeElement.innerHTML = "";

        signal.get().forEach((item: any) => {
          const templateElement = document.createElement("template");
          templateElement.innerHTML = this.template;

          const templateRef = new TemplateRef(templateElement.content);

          this.viewFactory.createEmbededView(templateRef, item);
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
