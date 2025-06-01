import "reflect-metadata";
import { ComponentTemplate, Constructor } from "../components/component";
import { IInjector, Injector } from "../services/injector";
import { viewChildSubject } from "../authoring/queries";
import { ElementRef, renderWebcomonent, ViewFactory } from "./view.builder";

export interface ICustomerElement {
  component: any | null;
  elementRef: ElementRef<Element>;
  injector: IInjector;
}

// Créer un systéme permettant de gérer l'insertion dynamique des vues

export const registerComponent = (
  services: IInjector,
  componentTemplate: ComponentTemplate
) => {
  // C'est au renderer de se charger de rendre
  // Limité l'héritage à HTMLElement (safari ne fonctionne qu'avec des CustomElement autonomne). Il ne supporte pas les éléments personalisé comme HTMLInputElement ect....
  // Apple à pris la décision de ne jamais implémenter cette fonctionnalités
  // Lors de l'implémentation de l'événement déclenchant la suppresion du custom, faire attention à safarie pouvant rencontrer des comportement incohérents.
  // Pour une bonne implémentation: https://nolanlawson.com/2024/12/01/avoiding-unnecessary-cleanup-work-in-disconnectedcallback/
  class CustomElement extends HTMLElement implements ICustomerElement {
    // Ce services là doit est dirrectement en rapport avec le type de component.
    // Il doit se construire à la racine. Defaut de conception et perte en terme de performance.
    public readonly injector: Injector = new Injector();
    public readonly component: any | null = null;
    public readonly elementRef: ElementRef<Element>;
    private readonly componentType: Constructor<any>;
    private viewFactory: ViewFactory | null = null;

    constructor() {
      super();

      this.componentType = componentTemplate.componentType;

      // Le parent correspond à l'environment injector
      this.injector.parent = services;

      const shadow: ShadowRoot = this.attachShadow({
        mode: "open",
      });

      this.elementRef = new ElementRef(shadow.host);

      this.injector
        .bind<() => ViewFactory | null>(ViewFactory)
        .toFactory(() => () => this.viewFactory);

      this.injector.bind(ElementRef).toConstantValue(this.elementRef);

      this.component = this.injector.get(this.componentType);

      renderWebcomonent(
        this.component,
        componentTemplate.template,
        this.injector,
        this.elementRef
      );
    }

    async connectedCallback() {
      const tags = [
        ...new Set(
          [...(this.shadowRoot?.querySelectorAll(":not(:defined)") ?? [])].map(
            (element) => element.localName
          )
        ),
      ];

      const promises = tags.map((tag) => customElements.whenDefined(tag));

      await Promise.all(promises);

      if (this.shadowRoot) {
        viewChildSubject.notify(this.componentType, this.shadowRoot);
      }

      // Maintenant dans mon context, cela sertivera plus comme une classe helper
      // Pour le rendu dynamique. Elle est toujours utilisé pour les directvees.
      // Est disponible que dans le afterViewInit
      // Il devrait être récupérer à partir du componentRef
      this.viewFactory = new ViewFactory(
        this.elementRef,
        this.component,
        this.injector
      );

      if (
        this.component.afterViewInit &&
        typeof this.component.afterViewInit === "function"
      ) {
        this.component.afterViewInit();
      }
    }
  }

  customElements.define(componentTemplate.selector, CustomElement);
};
