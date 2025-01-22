import { Container } from "inversify";
import { IServiceCollection } from "../services/service.collection";

class ComponentBuilder {
  private componentTemplate: ComponentTemplate;
  private children: ComponentBuilder[] = [];

  constructor(
    public services: IServiceCollection,
    componentType: Constructor<IComponent>
  ) {
    this.componentTemplate = new ComponentTemplateMetadata(
      componentType
    ).componentTemplate;
  }

  build(): ComponentRef {
    const compponentRef = new ComponentRef(
      this.componentTemplate,
      this.services
    );

    this.children.forEach((childBuilder) => {
      compponentRef.add(childBuilder.build());
    });

    return compponentRef;
  }

  addChild(child: ComponentBuilder): void {
    this.children.push(child);
  }
}

export class ComponentFactory {
  static create(
    componentType: Constructor<IComponent>,
    services: IServiceCollection
  ): ComponentBuilder {
    const componentBuilder = new ComponentBuilder(services, componentType);

    const imports = new ImportComponentMetada(componentType);

    imports.importComponents.forEach((importComponent) => {
      const childBuilder = this.create(
        importComponent,
        componentBuilder.services
      );
      componentBuilder.addChild(childBuilder);
    });

    return componentBuilder;
  }
}

export type Constructor<T> = {
  new (...args: any[]): T;
  prototype: T;
};

export interface IComponent {
  afterViewInit?: () => void;
}

// Doit être géré par un renderer
export class ElementRef<TElement extends HTMLElement> {
  constructor(public nativeElement: TElement) {}

  addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ) {
    this.nativeElement.addEventListener(type, listener, options);
  }
}

const childViews: Map<
  Constructor<IComponent>,
  { object: { [key: string]: any }; propertyKey: string }
> = new Map();

const containerRef = new Map<Constructor<IComponent>, ComponentRef>();

export class ComponentRef {
  public readonly services: IServiceCollection; // A revoir

  private children: ComponentRef[] = [];

  constructor(
    private componentTemplate: ComponentTemplate,
    services: IServiceCollection
  ) {
    this.services = new Container({ autoBindInjectable: true });
    this.services.parent = services;
    containerRef.set(componentTemplate.componentType, this);
  }

  add(child: ComponentRef) {
    this.children.push(child);
  }

  // C'est au renderer de se charger de rendre ???
  render() {
    const self = this;
    const componentTemplate = self.componentTemplate;

    // Regarder avec requestScope
    self.services
      .bind(componentTemplate.componentType)
      .toSelf()
      .inSingletonScope();

    // Limité l'héritage à HTMLElement (safari ne fonctionne qu'avec des CustomElement autonomne). Il ne supporte pas les éléments personalisé comme HTMLInputElement ect....
    // Apple à pris la décision de ne jamais implémenter cette fonctionnalités
    // Lors de l'implémentation de l'événement déclenchant la suppresion du custom, faire attention à safarie pouvant rencontrer des comportement incohérents.
    // Pour une bonne implémentation: https://nolanlawson.com/2024/12/01/avoiding-unnecessary-cleanup-work-in-disconnectedcallback/
    class CustomElement extends HTMLElement {
      constructor() {
        super();

        // @ViewChild (si je souhaite un component, alors j'utilise l'injection de dépendance).
        // Sinon je devrais injecter dinamiquement dans l'injecteur.
        // de dépendance. Servira je pense pour le destroy
        // Via le @ViewChild, je pourrais facilement rajouter des options pour implémenter un ngModel native.
        self.services.bind(ElementRef).toConstantValue(new ElementRef(this));

        const shadow = this.attachShadow({ mode: "open" }); // A passer dans le decorateur. A voir si faut closed

        shadow.appendChild(componentTemplate.createTemplate());
      }

      // IMPORTANT CAR C'est ici où je pourrais savoir si les élements que je tenterai
      // d'injecté on été rendu par le dom
      connectedCallback() {
        // Je pourrais enregistrer dans l'injecteur de dépendence le (this)
        // Je pourrais créer un decorateur à utiliser dans le component pour accéder à es élement enfant.
        // Via @ViewChild

        // Là j'ai un doute ...
        const component = self.services.get(componentTemplate.componentType);
        self.services.parent
          ?.bind(componentTemplate.componentType)
          .toConstantValue(component);

        this.addEventListener("change", () => {
          console.log(`${componentTemplate.selector} changed`);
        });

        // Doit être géré par le renderer
        document.addEventListener("DOMContentLoaded", () => {
          childViews.forEach((prop, childType) => {
            const view = self.children.find(
              (childRef) => childRef === containerRef.get(childType)
            );
            const childComponent = view?.services.get(childType);
            prop.object[prop.propertyKey] = childComponent;
          });

          if (component.afterViewInit) {
            component.afterViewInit();
          }
        });
      }
    }

    // Dissocier les childs du component avec un ViewChidlRed ou un ruc du genre
    self.children.forEach((childRef) => {
      childRef.render();
    });

    customElements.define(componentTemplate.selector, CustomElement);
  }
}

export function ViewChild(service: Constructor<IComponent>) {
  return function defineViewChild(
    object: { [key: string]: any },
    propertyKey: string
  ) {
    const childRef = containerRef.get(service);
    const component = childRef?.services.parent?.get(service);
    object[propertyKey] = component;

    childViews.set(service, { object, propertyKey });
  };
}

class ComponentTemplate {
  constructor(
    public selector: string,
    private template: string,
    public componentType: Constructor<IComponent>
  ) {}

  createTemplate() {
    const html = HTML_TEMPLATES[this.template];

    const parser = new DOMParser();

    const template = parser
      .parseFromString(html, "text/html")
      .querySelector("template");

    if (!template) {
      throw new Error(
        `Aucun html spécifié pour le template ${this.template}. Veuilliez verifier l'ortographe ou l'existance de votre template`
      );
    }

    // Récupérer les childview (à gérer dans un systéme à part)
    // Pas oublier de supprimer cette ref (pour netoyer le html)
    const content = template.content;
    const childs = [...content.children].filter((element) =>
      [...element.attributes].some((attr) => attr.name.startsWith("#"))
    );
    // Je l'entregistre dans le view children. avec un systéme de clé valeur fourni par l'attribut lui même.
    // Je pourrais donc y avoir accés via le nom de l'attribut. A voir comment gérer l'encapsulation (on a pas le droit dans
    // le composant enfant d'avooir accés à une ref se trouvant dans le composant parent)

    return content;
  }
}

// Créer un services Renderer singleton utilisable pour manipuler le Dom.
// Par exemple je pourrait associer un event à un evenement qui retournera un unscrible pour supprimer l'event.
// Cela me permet de standardiser et gérer plus facilement les mutations du dom
export class ComponentTemplateMetadata {
  private readonly metadataKey = "componentTemplate";
  public componentTemplate: ComponentTemplate;

  constructor(private component: Constructor<IComponent>) {
    this.componentTemplate =
      Reflect.getMetadata(this.metadataKey, component) ?? {};
  }

  register(componentTemplate: ComponentTemplate) {
    this.componentTemplate = componentTemplate;
    // Vérifier si double key (selectors), et si c'est le cas créer une erreur
    Reflect.defineMetadata(
      this.metadataKey,
      this.componentTemplate,
      this.component
    );
  }
}

export class ImportComponentMetada {
  private readonly metadataKey = "componentImports";
  public importComponents: Constructor<IComponent>[];

  constructor(private component: Constructor<IComponent>) {
    this.importComponents =
      Reflect.getMetadata(this.metadataKey, component) ?? [];
  }

  register(importComponents: Constructor<IComponent>[]) {
    this.importComponents = importComponents;
    Reflect.defineMetadata(
      this.metadataKey,
      this.importComponents,
      this.component
    );
  }
}

// Créer une canal de communication (pour passer des props). Leur définition doivent se faire
// avec le binding des évement. Cela peut être utilisé via l'injection de dépendance

export function Component(option: {
  selector: string;
  template: string;
  standalone: boolean;
  imports?: Constructor<IComponent>[];
}) {
  return function defineComponent<T extends Constructor<IComponent>>(
    constructor: T
  ) {
    const componentTemplateMetadata = new ComponentTemplateMetadata(
      constructor
    );
    componentTemplateMetadata.register(
      new ComponentTemplate(option.selector, option.template, constructor)
    );

    const importComponentMetadata = new ImportComponentMetada(constructor);
    importComponentMetadata.register(option.imports ?? []);
  };
}

// Quand je voudrais désenregister un customelement (customElements.define(componentTemplate.selector, CustomElement, { extends: 'div' });)
