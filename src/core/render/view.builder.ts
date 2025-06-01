import { Constructor } from "../plateform";
import { Injector } from "../services/injector";
import { ICustomerElement } from "./register.component";
import { Renderer } from "./renderer";
import { compileTemplate } from "./template.compiler";

export class ElementRef<TElement extends Element> {
  constructor(public nativeElement: TElement) {}
}

// Sert uniquement lors du rendu d'un webcomponent
export const renderWebcomonent = (
  component: any,
  templateRef: TemplateRef,
  injector: Injector,
  elementRef: ElementRef<Element>
) => {
  const componentRef = new ComponentRef(
    elementRef,
    templateRef,
    component,
    injector
  );

  elementRef.nativeElement.shadowRoot!.appendChild(templateRef.element);

  return componentRef;
};

// Classe helper gérant le rendu dynamiquement d'un template.
export class ViewFactory {
  constructor(
    private elementRef: ElementRef<Element>,
    private context: any,
    private localInjector: Injector
  ) {}

  createEmbededView(
    templateRef: TemplateRef,
    context: any,
    services: Injector | null = null
  ) {
    let injector: Injector;

    if (services) {
      injector = services;
    } else {
      injector = this.localInjector;
    }

    const embededViewRef = new EmbededViewRef(
      templateRef,
      { ...this.context, ...context },
      injector
    );

    this.elementRef.nativeElement.appendChild(templateRef.element);

    return embededViewRef;
  }

  /*
    Permet d'insérer un component 
    comonentType: le type du component que l'on veut rendre
    Injector: sépicie  l'injector local du component. Sinon on utilise celui par défaut. 
  */
  createView(
    componentType: Constructor<any>,
    injector: Injector | null = null
  ) {
    /*     
      Il manque des bout pour gérer l'injector. 
      Regarder si le component est enregistré. Si il ne l'est pas alors je léve une exception. 
      Si il l'est je crée l'élément. Cela exécutera automatiquement le code du registrercomponent. 
      Et j'insére le customelement dans le container. 
   */
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
      throw new Error("un probléme"); // Le messsage d'erreur doit être plus explicite
    }

    return templateEl.content;
  }
}

// Pourra implémenter un destroy pour disparaitre du dom par exemple. Ou encore un detach ect ect...
// ou encore une methode pour réaparaitre au même endroit.
abstract class ViewRef {
  protected renderer = new Renderer();

  constructor(
    protected templateRef: TemplateRef,
    protected context: any,
    protected injector: Injector
  ) {
    const bindings = compileTemplate(this.templateRef);
    bindings?.forEach((binding) => {
      if (binding.type === "directive") {
        
        binding.bind(injector, context);
      } else if (binding.type === "event") {
        binding.bind(context, this.renderer);
      } else {
        binding.bind(context);
      }
    });
  }
}

export class EmbededViewRef extends ViewRef {
  constructor(templateRef: TemplateRef, context: any, injector: Injector) {
    super(templateRef, context, injector);
  }
}

export class ComponentRef extends ViewRef {
  constructor(
    elementRef: ElementRef<Element>,
    templateRef: TemplateRef,
    component: any,
    injector: Injector
  ) {
    // Création d'un context attaché au child, qui possédera l'instance du component #context implicitement.
    // Ainsi dans le childrenView, j'aurai juste à renseigner sa référence pour requété dessus (type === instance.typ)
    // Ou encore mieux ! directement binder les variable (viewchildren) du component ici ? A voir et experimenter.

    const customerElement =
      elementRef.nativeElement as unknown as ICustomerElement;

    const parent = elementRef.nativeElement.getRootNode();

    // On injecte les paramétre du parent vers l'enfant.
    if (parent instanceof ShadowRoot) {
      // Chaque injector component hérite de celui du parent
      injector.parent = (parent.host as unknown as ICustomerElement).injector;

      [...elementRef.nativeElement.shadowRoot!.host.attributes].forEach(
        (attr) => {
          if (attr.name in customerElement.component) {
            customerElement.component[attr.name] = (
              parent.host as unknown as ICustomerElement
            ).component[attr.value];
          }
        }
      );
    }

    super(templateRef, component, injector);
  }
}
