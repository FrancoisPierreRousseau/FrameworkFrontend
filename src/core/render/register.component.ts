import { ComponentTemplate, Constructor } from "../components/component";
import {
  IServiceCollection,
  ServicesColletion,
} from "../services/service.collection";
import { viewChildSubject } from "../authoring/queries";
import { ElementRef, ViewFactory } from "./view.builder";

export interface ICustomerElement {
  component: any | null;
  elementRef: ElementRef<HTMLElement>;
  services: IServiceCollection;
}

// Créer un systéme permettant de gérer l'insertion dynamique des vues

export const registerComponent = (
  services: IServiceCollection,
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
    public readonly services: IServiceCollection = new ServicesColletion({
      autoBindInjectable: true,
    });
    public readonly component: any | null = null;
    public readonly elementRef: ElementRef<HTMLElement> = new ElementRef(this);
    private readonly componentType: Constructor<any>;

    constructor() {
      super();

      this.componentType = componentTemplate.componentType;

      this.services.parent = services;

      this.elementRef = new ElementRef(this);

      this.services.bind(ElementRef).toConstantValue(this.elementRef);

      this.component = this.services.get(this.componentType);

      const viewFactory = this.services.get(ViewFactory);

      viewFactory.createView(
        this.component,
        this.services,
        componentTemplate.template
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
