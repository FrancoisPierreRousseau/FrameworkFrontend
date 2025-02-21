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
    public readonly services: IServiceCollection = new ServicesColletion({
      autoBindInjectable: true,
    });
    public readonly component: any | null = null;
    public readonly elementRef: ElementRef<HTMLElement> = new ElementRef(this);
    private readonly componentType: Constructor<any>;

    constructor() {
      super();

      // Ici initialisation des props

      this.componentType = componentTemplate.componentType;

      this.services.parent = services;

      this.elementRef = new ElementRef(this);

      // console.log(this.elementRef.nativeElement.querySelectorAll("[\\#]"));

      // Via le @ViewChild, je pourrais facilement rajouter des options pour implémenter un ngModel native.
      this.services.bind(ElementRef).toConstantValue(this.elementRef);

      this.component = this.services.get(componentTemplate.componentType);

      const viewFactory = new ViewFactory(this.component);
      this.services.bind(ViewFactory).toConstantValue(viewFactory);

      const templateRef = componentTemplate.template;
      viewFactory.createView(this.services, templateRef);
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
