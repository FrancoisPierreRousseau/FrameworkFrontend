import { Container } from "inversify";
import {
  ComponentTemplate,
  Constructor,
  ElementRef,
} from "../components/component";
import { IServiceCollection } from "../services/service.collection";
import { viewChildSubject } from "../authoring/queries";
import { Compiler } from "../compiler/compiler";
import { Renderer } from "./renderer";

export interface ICustomerElement {
  component: any | null;
  elementRef: ElementRef<HTMLElement>;
}

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
    private services: IServiceCollection = new Container({
      autoBindInjectable: true,
    });
    public component: any | null = null;
    public elementRef: ElementRef<HTMLElement> = new ElementRef(this);
    private componentType: Constructor<any>;
    private renderer: Renderer = new Renderer();

    constructor() {
      super();

      // Ici initialisation des props

      this.componentType = componentTemplate.componentType;

      this.services.parent = services;

      this.services.bind(this.componentType).toSelf().inTransientScope();

      this.elementRef = new ElementRef(this);

      // console.log(this.elementRef.nativeElement.querySelectorAll("[\\#]"));

      // Via le @ViewChild, je pourrais facilement rajouter des options pour implémenter un ngModel native.
      this.services.bind(ElementRef).toConstantValue(this.elementRef);

      const shadow = this.attachShadow({ mode: "open" }); // A passer dans le decorateur. A voir si faut closed

      this.component = this.services.get(this.componentType);

      const compiler = new Compiler(
        componentTemplate,
        this.component,
        this.renderer
      );

      shadow.appendChild(compiler.compile());
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
