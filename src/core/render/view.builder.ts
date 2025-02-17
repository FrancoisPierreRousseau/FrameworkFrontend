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

const CONTEXT_TOKEN = Symbol.for("CONTEXT_TOKEN");

export class ViewFactory {
  private injector = new ServicesColletion();

  constructor(private component: any) {}

  createEmbededView(templateRef: TemplateRef, context: any) {
    this.injector.bind(TemplateRef).toConstantValue(templateRef);
    this.injector.bind(ServicesColletion).toConstantValue(this.injector);
    this.injector
      .bind(CONTEXT_TOKEN)
      .toConstantValue({ ...context, ...this.component });

    this.injector.get(EmbededView);
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
    this.injector.bind(ServicesColletion).toConstantValue(this.injector);

    return this.injector.get(ShadowView);
  }
}

export class TemplateRef {
  constructor(public element: DocumentFragment) {}
}

export interface IView {}

export class EmbededView implements IView {
  private renderer = new Renderer();

  constructor(
    @inject(ElementRef) elementRef: ElementRef<Element>,
    @inject(TemplateRef) templateRef: TemplateRef,
    @inject(CONTEXT_TOKEN) context: any,
    @inject(ServicesColletion) serviceCollection: ServicesColletion
  ) {
    const childs = templateRef.element.querySelectorAll(":defined");
    const domBinder = new DOMBinder(this.renderer);

    if (childs.length > 0) {
      childs.forEach((child) => {
        if (child instanceof HTMLElement && child.hasAttribute("*for")) {
          const elementRef = new ElementRef(child);
          serviceCollection.bind(ElementRef).toConstantValue(elementRef);
          const list = serviceCollection.get(ListView);
          list.create(context[child.getAttribute("*for") || ""]);
          child.removeAttribute("*for");
        } else {
          domBinder.bind(child, context);
        }
      });
    }
  }
}

export class ShadowView implements IView {
  private renderer = new Renderer();

  constructor(
    @inject(ElementRef) elementRef: ElementRef<Element>,
    @inject(TemplateRef) templateRef: TemplateRef,
    @inject(CONTEXT_TOKEN) context: any,
    @inject(ServicesColletion) serviceCollection: ServicesColletion
  ) {
    const shadow = elementRef.nativeElement.attachShadow({ mode: "open" });
    const customerElement = shadow.host as unknown as ICustomerElement;
    const parent = shadow.host.getRootNode();

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
    const domBinder = new DOMBinder(this.renderer);

    if (childs.length > 0) {
      childs.forEach((child) => {
        if (child instanceof HTMLElement && child.hasAttribute("*for")) {
          const elementRef = new ElementRef(child);
          serviceCollection.bind(ElementRef).toConstantValue(elementRef);
          const list = serviceCollection.get(ListView);
          list.create(context[child.getAttribute("*for") || ""]);
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
    console.log("hello");
  }

  create(signal: any): Node {
    if (signal instanceof Signal) {
      const update = () => {
        this.elementRef.nativeElement.innerHTML = "";
        console.log(this.elementRef);
        signal.get().forEach((item: any) => {
          const templateElement = document.createElement("template");
          templateElement.innerHTML = this.template;

          const templateRef = new TemplateRef(templateElement.content);

          this.viewFactory.createEmbededView(templateRef, item);

          this.elementRef.nativeElement.appendChild(templateRef.element);
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
