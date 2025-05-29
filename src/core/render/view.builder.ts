import { inject } from "inversify";
import { IInjector, Injector } from "../services/service.collection";
import { ICustomerElement } from "./register.component";
import { Renderer } from "./renderer";
import { compileTemplate } from "./template.compiler";

// Doit être géré par un renderer
export class ElementRef<TElement extends Element> {
  constructor(public nativeElement: TElement) {}
}

export const CONTEXT_TOKEN = Symbol.for("CONTEXT_TOKEN");

// Gére la hierarchie des injectors et la construction des views
export class ViewFactory {
  private injector = new Injector();

  constructor() {}

  createEmbededView(
    templateRef: TemplateRef,
    context: any,
    services: Injector | null = null
  ) {
    this.injector.parent = services;

    this.injector.bind(TemplateRef).toConstantValue(templateRef);
    this.injector.bind(Injector).toConstantValue(this.injector);
    this.injector.bind(CONTEXT_TOKEN).toConstantValue(context);

    this.injector.get(EmbededView);
  }

  createView(
    component: any,
    services: IInjector | null = null,
    templateRef: TemplateRef
  ) {
    this.injector.parent = services;

    this.injector.bind(TemplateRef).toConstantValue(templateRef);
    this.injector.bind(CONTEXT_TOKEN).toConstantValue(component);
    this.injector.bind(Injector).toConstantValue(this.injector);

    return this.injector.get(ShadowView);
  }
}

export class TemplateRef {
  private fragment: DocumentFragment;

  constructor(private raw: string /*public element: DocumentFragment */) {
    this.fragment = this.creatFragment();
  }

  public get element(): DocumentFragment {
    if (this.fragment.childNodes.length === 0) {
      this.fragment = this.creatFragment();
    }

    return this.fragment;
  }

  private creatFragment() {
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.raw, "text/html");
    const templateEl = doc.querySelector("template");

    if (!templateEl) {
      throw new Error("un probléme"); // Et indiquer le nom du template posant probléme en question
    }

    return templateEl.content;
  }
}

export interface IView {}

abstract class AbstractView implements IView {
  protected renderer = new Renderer();

  constructor(
    @inject(ElementRef) protected elementRef: ElementRef<Element>,
    @inject(TemplateRef) protected templateRef: TemplateRef,
    @inject(CONTEXT_TOKEN) protected context: any,
    @inject(Injector) protected serviceCollection: Injector
  ) {
    const bindings = compileTemplate(this.templateRef);
    bindings?.forEach((binding) => {
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
    @inject(Injector) serviceCollection: Injector
  ) {
    // Création d'un context attaché au child, qui possédera l'instance du component #context implicitement.
    // Ainsi dans le childrenView, j'aurai juste à renseigner sa référence pour requété dessus (type === instance.typ)

    const shadow: ShadowRoot = elementRef.nativeElement.attachShadow({
      mode: "open",
    });
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
