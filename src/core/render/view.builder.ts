import { inject } from "inversify";
import { IInjector, Injector } from "../services/service.collection";
import { ICustomerElement } from "./register.component";
import { Renderer } from "./renderer";
import { compileTemplate } from "./template.compiler";

export class ElementRef<TElement extends Element> {
  constructor(public nativeElement: TElement) {}
}

export const CONTEXT_TOKEN = Symbol.for("CONTEXT_TOKEN");

// Gére la hierarchie des injectors et la construction des views
export class ViewFactory {
  private injector = new Injector();

  constructor(
    @inject(ElementRef) private elementRef: ElementRef<HTMLElement>
  ) {}

  createEmbededView(
    templateRef: TemplateRef,
    context: any,
    services: Injector | null = null
  ) {
    this.injector.parent = services;

    this.injector.bind(TemplateRef).toConstantValue(templateRef);
    this.injector.bind(Injector).toConstantValue(this.injector);
    this.injector.bind(CONTEXT_TOKEN).toConstantValue(context);

    const embededViewRef = this.injector.get(EmbededView);

    this.elementRef.nativeElement.appendChild(templateRef.element);

    return embededViewRef;
  }

  // Cette méthode fonctionne que partiellement, dans le sens que
  // le webcomponent devrait être insérer à la fin dans le nativement element. Ce n'est à l'heure pas le cas
  // Cependant cela devrait être le cas. Donc gérer la construction du selector root par ce systéme là
  // pourrait être intéréssant pour la standardisaition.
  createView(
    component: any,
    services: IInjector | null = null,
    templateRef: TemplateRef
  ) {
    this.injector.parent = services;

    this.injector.bind(TemplateRef).toConstantValue(templateRef);
    this.injector.bind(CONTEXT_TOKEN).toConstantValue(component);
    this.injector.bind(Injector).toConstantValue(this.injector);

    return this.injector.get(ComponentRef);
  }

  clear() {
    this.elementRef.nativeElement.innerHTML = "";
  }
}

export class TemplateRef {
  private fragment: DocumentFragment;

  constructor(private raw: string) {
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

// Pourra implémenter un destroy pour disparaitre du dom par exemple.
// ou encore une methode pour réaparaitre au même endroit.
abstract class ViewRef {
  protected renderer = new Renderer();

  constructor(
    protected templateRef: TemplateRef,
    protected context: any,
    protected serviceCollection: Injector
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

export class EmbededView extends ViewRef {
  constructor(
    @inject(TemplateRef) templateRef: TemplateRef,
    @inject(CONTEXT_TOKEN) context: any,
    @inject(Injector) injector: Injector
  ) {
    super(templateRef, context, injector);
  }
}

export class ComponentRef extends ViewRef {
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

    // On injecte les paramétre du parent vers l'enfant.
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

    super(templateRef, context, serviceCollection);

    shadow.appendChild(templateRef.element);
  }
}
