import { viewChildFn } from "../authoring/queries";
import {
  BindingInstruction,
  CompiledTemplate,
  compileTemplate,
} from "../render/template.compiler";
import { TemplateRef } from "../render/view.builder";

export class ComponentFactory {
  private static componentTemplates: Set<ComponentTemplate> = new Set();

  static create(componentType: Constructor<any>): ComponentTemplate[] {
    const { componentTemplate } = new ComponentTemplateMetadata(componentType);
    ComponentFactory.componentTemplates.add(componentTemplate);

    const imports = new ImportComponentMetada(componentType);

    imports.importComponents.forEach((importComponent) => {
      this.create(importComponent);
    });

    return [...ComponentFactory.componentTemplates.values()];
  }
}

export type Constructor<T> = {
  new (...args: any[]): T;
  prototype: T;
};

export class ComponentTemplate {
  public compiled: CompiledTemplate;

  private html: string;

  constructor(
    public selector: string,
    private templateKey: string,
    public componentType: Constructor<any>
  ) {
    this.html = HTML_TEMPLATES[templateKey];

    if (!this.html) {
      throw new Error(
        `Aucun html spécifié pour le template ${this.templateKey}. Veuilliez verifier l'ortographe ou l'existance de votre template`
      );
    }

    this.compiled = compileTemplate(this.html);
  }

  get template(): TemplateRef {
    if (!this.compiled.template) {
      throw new Error("un probléme"); // Et indiquer le nom du template posant probléme en question
    }

    return new TemplateRef(this.compiled.template, this.compiled.bindings);
  }

  get bindings(): BindingInstruction[] {
    return this.compiled.bindings;
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
    viewChildFn(constructor);

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
