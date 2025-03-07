import { inject } from "inversify";
import { DOMBinder, Signal } from "./reactivity.ref";
import {
  IServiceCollection,
  ServicesColletion,
} from "../services/service.collection";
import { ICustomerElement } from "./register.component";
import { Renderer } from "./renderer";
import { ServiceTest } from "../../app/service.test";

// Doit être géré par un renderer
export class ElementRef<TElement extends Element> {
  constructor(public nativeElement: TElement) {}
}

const CONTEXT_TOKEN = Symbol.for("CONTEXT_TOKEN");

// Gére la hierarchie des injectors et la construction des views
export class ViewFactory {
  private injector = new ServicesColletion();

  constructor() {}

  createEmbededView(
    templateRef: TemplateRef,
    context: any,
    services: ServicesColletion | null = null
  ) {
    this.injector.parent = services;

    this.injector.bind(TemplateRef).toConstantValue(templateRef);
    this.injector.bind(ServicesColletion).toConstantValue(this.injector);
    this.injector.bind(CONTEXT_TOKEN).toConstantValue(context);

    this.injector.get(EmbededView);
  }

  createView(
    component: any,
    services: IServiceCollection | null = null,
    templateRef: TemplateRef
  ) {
    this.injector.parent = services;

    this.injector.bind(TemplateRef).toConstantValue(templateRef);
    this.injector.bind(CONTEXT_TOKEN).toConstantValue(component);
    this.injector.bind(ServicesColletion).toConstantValue(this.injector);

    return this.injector.get(ShadowView);
  }
}

export class TemplateRef {
  constructor(public element: DocumentFragment) {}
}

export interface IView {}

abstract class AbstractView implements IView {
  protected renderer = new Renderer();

  constructor(
    @inject(ElementRef) protected elementRef: ElementRef<Element>,
    @inject(TemplateRef) protected templateRef: TemplateRef,
    @inject(CONTEXT_TOKEN) protected context: any,
    @inject(ServicesColletion) protected serviceCollection: ServicesColletion
  ) {
    const childs = this.templateRef.element.querySelectorAll(":defined");
    const domBinder = new DOMBinder(this.renderer);

    if (childs.length > 0) {
      childs.forEach((child) => {
        if (child instanceof HTMLElement && child.hasAttribute("*for")) {
          const elementRef = new ElementRef(child);

          // Defaut de conception, on écrase le elementref de l'élement précédement.
          // Cecis est une directivce donc rattché à la child est doit être stocké quelque pars (utilisé plus tard dans le cycle de vie)
          this.serviceCollection.bind(ElementRef).toConstantValue(elementRef);
          const list = this.serviceCollection.get(ListView);
          list.create(this.context[child.getAttribute("*for") || ""]);

          // Création d'un context attaché au child, qui possédera l'instance de la directive.
          // Ainsi dans le childrenView, j'aurai juste à renseigner sa référence pour requété dessus (type === instance.typ)
          child.removeAttribute("*for");
        } else {
          domBinder.bind(child, this.context);
        }
      });
    }
  }
}

export class EmbededView extends AbstractView implements IView {}

export class ShadowView extends AbstractView implements IView {
  constructor(
    @inject(ElementRef) elementRef: ElementRef<Element>,
    @inject(TemplateRef) templateRef: TemplateRef,
    @inject(CONTEXT_TOKEN) context: any,
    @inject(ServicesColletion) serviceCollection: ServicesColletion
  ) {
    // Création d'un context attaché au child, qui possédera l'instance du component #context implicitement.
    // Ainsi dans le childrenView, j'aurai juste à renseigner sa référence pour requété dessus (type === instance.typ)

    const shadow = elementRef.nativeElement.attachShadow({ mode: "open" });
    const customerElement = shadow.host as unknown as ICustomerElement;
    const parent = shadow.host.getRootNode();

    if (parent instanceof ShadowRoot) {
      serviceCollection.parent = (
        parent.host as unknown as ICustomerElement
      ).services;

      [...shadow.host.attributes].forEach((attr) => {
        if (attr.name in customerElement.component) {
          customerElement.component[attr.name] = (
            parent.host as unknown as ICustomerElement
          ).component[attr.value];
        }
      });
    }

    super(elementRef, templateRef, context, serviceCollection);

    shadow.appendChild(templateRef.element);
  }
}

// a deplacer dans un dossiers directive (et faire reference dans l'injecteur à des interfaces). Peut être cela resoudra le probléme d'initialisation
export class ListView {
  private template: string;

  constructor(
    @inject(ElementRef) private elementRef: ElementRef<HTMLElement>,
    @inject(ViewFactory) private viewFactory: ViewFactory,
    @inject(CONTEXT_TOKEN) private parentContext: any,
    @inject(ServicesColletion) private servicesCollection: ServicesColletion,
    @inject(ServiceTest) private serviceTest: ServiceTest
  ) {
    this.template = elementRef.nativeElement.innerHTML;
  }

  create(signal: any): Node {
    if (signal instanceof Signal) {
      const update = () => {
        this.elementRef.nativeElement.innerHTML = "";
        signal.get().forEach((item: any) => {
          const templateElement = document.createElement("template");
          templateElement.innerHTML = this.template;
          console.log(item);
          const templateRef = new TemplateRef(templateElement.content);

          this.viewFactory.createEmbededView(
            templateRef,
            {
              ...this.parentContext,
              ...item,
            },
            this.servicesCollection
          );

          this.elementRef.nativeElement.appendChild(templateRef.element);
        });
      };
      signal.subscribe(update);
      update();
    }

    return this.elementRef.nativeElement;
  }
}
