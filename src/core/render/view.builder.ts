import { inject } from "inversify";
import { Signal } from "./reactivity.ref";
import {
  IServiceCollection,
  ServicesColletion,
} from "../services/service.collection";
import { ICustomerElement } from "./register.component";
import { Renderer } from "./renderer";
import { ServiceTest } from "../../app/service.test";
import { BindingInstruction, compileTemplate } from "./template.compiler";

// Doit être géré par un renderer
export class ElementRef<TElement extends Element> {
  constructor(public nativeElement: TElement) {}
}

export const CONTEXT_TOKEN = Symbol.for("CONTEXT_TOKEN");

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
  constructor(
    public element: DocumentFragment,
    public bindings?: BindingInstruction[]
  ) {}
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
    templateRef.bindings?.forEach((binding) => {
      if (binding.type === "directive") {
        binding.bind(serviceCollection, context);
      } else if (binding.type === "event") {
        binding.bind(context, this.renderer);
      } else {
        binding.bind(context);
      }
    });
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

    // On réccupére les variables d'en des parents
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
          if (!/^<template>[\s\S]*<\/template>$/.test(this.template)) {
            this.template = `<template>${this.template}</template>`;
          }
          const templateCompiled = compileTemplate(this.template);

          const templateRef = new TemplateRef(
            templateCompiled.template,
            templateCompiled.bindings
          );

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
