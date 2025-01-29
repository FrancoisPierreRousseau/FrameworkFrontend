import { Container } from "inversify";
import { IServiceCollection } from "../services/service.collection";

class ComponentBuilder {
  private componentTemplate: ComponentTemplate;
  private children: ComponentBuilder[] = [];

  constructor(componentType: Constructor<any>) {
    this.componentTemplate = new ComponentTemplateMetadata(
      componentType
    ).componentTemplate;
  }

  build(): ComponentRef {
    const compponentRef = new ComponentRef(this.componentTemplate);

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
  static create(componentType: Constructor<any>): ComponentBuilder {
    const componentBuilder = new ComponentBuilder(componentType);

    const imports = new ImportComponentMetada(componentType);

    imports.importComponents.forEach((importComponent) => {
      const childBuilder = this.create(importComponent);
      componentBuilder.addChild(childBuilder);
    });

    return componentBuilder;
  }
}

export type Constructor<T> = {
  new (...args: any[]): T;
  prototype: T;
};

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

// Retournera un ViewChildBuilder.
// Il agrégera ordenera, structurera les childs (ref, classe ectect..)
// Il prendre le elementRef dans le constructeur au cas ou pour la selection par classe, id ect...
// En gros via un querySelectorAll. Si un element, un element sinon un tableau
type ViewChildBuilderFn = (
  components: any[],
  elementRef: ElementRef<HTMLElement>
) => void;

const viewChildBuilderFns: Map<
  Constructor<any>,
  ViewChildBuilderFn[]
> = new Map();

export class ComponentRef {
  private children: ComponentRef[] = [];

  public componentType: Constructor<any>;

  constructor(private componentTemplate: ComponentTemplate) {
    this.componentType = componentTemplate.componentType;
  }

  add(child: ComponentRef) {
    this.children.push(child);
  }

  // C'est au renderer de se charger de rendre
  render(
    services: IServiceCollection,
    callBack?: (component: any, elementRef: ElementRef<HTMLElement>) => any
  ) {
    const self = this;

    // Limité l'héritage à HTMLElement (safari ne fonctionne qu'avec des CustomElement autonomne). Il ne supporte pas les éléments personalisé comme HTMLInputElement ect....
    // Apple à pris la décision de ne jamais implémenter cette fonctionnalités
    // Lors de l'implémentation de l'événement déclenchant la suppresion du custom, faire attention à safarie pouvant rencontrer des comportement incohérents.
    // Pour une bonne implémentation: https://nolanlawson.com/2024/12/01/avoiding-unnecessary-cleanup-work-in-disconnectedcallback/
    class CustomElement extends HTMLElement {
      private childRef: ComponentRef[];
      private childs: any[] = [];
      private services: Container = new Container({ autoBindInjectable: true });
      private component: any | null = null;
      private elementRef: ElementRef<HTMLElement> = new ElementRef(this);
      private componentType: Constructor<any>;

      constructor() {
        super();

        this.componentType = self.componentTemplate.componentType;

        this.childRef = self.children;

        this.services.parent = services;

        this.services.bind(this.componentType).toSelf().inTransientScope();

        this.elementRef = new ElementRef(this);

        // console.log(this.elementRef.nativeElement.querySelectorAll("[\\#]"));

        // Dissocier les childs du component avec un ViewChidlRef ou un ruc du genre
        // Utiliser un reducer je pense. Voir comment structurer. Gérer daans une classe à part

        this.childRef.forEach((childRef) => {
          childRef.render(services, (childComponent, chidRef) => {
            if (
              [...chidRef.nativeElement.attributes].some((attr) =>
                attr.name.startsWith("#")
              )
            ) {
            }

            //[...element.attributes].some((attr) => attr.name.startsWith("#"))
            this.childs.push(childComponent);
          });
        });

        // Via le @ViewChild, je pourrais facilement rajouter des options pour implémenter un ngModel native.
        this.services.bind(ElementRef).toConstantValue(this.elementRef);

        const shadow = this.attachShadow({ mode: "open" }); // A passer dans le decorateur. A voir si faut closed

        const template = self.componentTemplate.createTemplate();

        shadow.appendChild(template);
      }

      // IMPORTANT CAR C'est ici où je pourrais savoir si les élements que je tenterai
      // d'injecté on été rendu par le dom
      connectedCallback() {
        // Je pourrais enregistrer dans l'injecteur de dépendence le (this)
        // Je pourrais créer un decorateur à utiliser dans le component pour accéder à es élement enfant.
        // Via @ViewChild

        this.component = this.services.get(this.componentType);

        if (callBack) {
          callBack(this.component, this.elementRef);
        }

        // Doit être géré par le renderer
        document.addEventListener("DOMContentLoaded", () => {
          (viewChildBuilderFns.get(this.componentType) ?? []).forEach(
            (viewChildBuilderFn) => {
              viewChildBuilderFn(this.childs, this.elementRef);
            }
          );

          if (
            this.component.afterViewInit &&
            typeof this.component.afterViewInit === "function"
          ) {
            this.component.afterViewInit();
          }
        });
      }
    }

    if (customElements.get(this.componentTemplate.selector) === undefined) {
      customElements.define(this.componentTemplate.selector, CustomElement);
    }
  }
}

class ViewChildBuilder {
  constructor(
    private childs: any[],
    private elementRef: ElementRef<HTMLElement>
  ) {}
}

const eventComponent: {
  [key: string]: any;
} = {};

// "En bonne voie" Je passe deux fois dans le ViewChild donc j'aggrége ps les évents
//  Dans app-comp je récupére que other-comp car c'est le dernieir qui domine. Il écase les autres
//  handlers.
// Je pense que pour fixe deg, je vais agréger dans un tableau les handler. Enfin, les exécuter tous dans le component.
// Et enfin, je vais passer à undefined le component event.
export function ViewChild(componentType: Constructor<any>) {
  return function defineViewChild(
    object: { [key: string]: any },
    propertyKey: string
  ) {
    object[propertyKey] = null;

    const viewChildBuilderFn: ViewChildBuilderFn = (chidrens, elementRef) => {
      if (
        typeof componentType === "function" &&
        componentType.prototype !== undefined
      ) {
        const components = chidrens.filter(
          (component) => component.constructor === componentType
        );

        if (components.length === 1) {
          object[propertyKey] = components[0];
        }

        if (components.length > 1) {
          object[propertyKey] = components;
        }
      }
    };

    eventComponent["component"] = (componentTypeMain: Constructor<any>) => {
      const builders = viewChildBuilderFns.get(componentTypeMain) ?? [];
      builders.push(viewChildBuilderFn);
      viewChildBuilderFns.set(componentTypeMain, builders);
    };
  };
}

class ComponentTemplate {
  constructor(
    public selector: string,
    private template: string,
    public componentType: Constructor<any>
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

    return template.content;
  }
}

// Créer un services Renderer singleton utilisable pour manipuler le Dom.
// Par exemple je pourrait associer un event à un evenement qui retournera un unscrible pour supprimer l'event.
// Cela me permet de standardiser et gérer plus facilement les mutations du dom
export class ComponentTemplateMetadata {
  private readonly metadataKey = "componentTemplate";
  public componentTemplate: ComponentTemplate;

  constructor(private component: Constructor<any>) {
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
  public importComponents: Constructor<any>[];

  constructor(private component: Constructor<any>) {
    this.importComponents =
      Reflect.getMetadata(this.metadataKey, component) ?? [];
  }

  register(importComponents: Constructor<any>[]) {
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
  imports?: Constructor<any>[];
}) {
  return function defineComponent<T extends Constructor<any>>(constructor: T) {
    eventComponent["component"](constructor);

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
