// Retournera un ViewChildBuilder.
// Il agrégera ordenera, structurera les childs (ref, classe ectect..)
// Il prendre le elementRef dans le constructeur au cas ou pour la selection par classe, id ect...

import { Constructor } from "../components/component";
import { ICustomerElement } from "../render/register.component";

type ViewChildBuilderFn = (shadowRoot: ShadowRoot) => void;

let builders: ViewChildBuilderFn[] = [];

class ViewChildSubject {
  private observers: Map<Constructor<any>, ViewChildBuilderFn[]> = new Map();

  constructor() {}

  subscribe(
    componentType: Constructor<any>,
    ...builderFn: ViewChildBuilderFn[]
  ) {
    const observers = this.observers.get(componentType) || [];
    observers.push(...builderFn);
    this.observers.set(componentType, observers);
  }

  notify(componentType: Constructor<any>, shadowRoot: ShadowRoot) {
    const observers = this.observers.get(componentType) || [];
    observers.forEach((observer) => observer(shadowRoot));
  }
}

export const viewChildSubject = new ViewChildSubject();

export function ViewChild(componentType: Constructor<any> | string) {
  return function defineViewChild(
    object: { [key: string]: any },
    propertyKey: string
  ) {
    object[propertyKey] = null;

    const viewChildBuilderFn: ViewChildBuilderFn = (shadowRoot) => {
      // const childs = [...(shadowRoot.querySelectorAll(":defined") ?? [])]; // Tout les éléments (imbriqué). Rajouter une prop pour cela
      const childs = [...shadowRoot.children]; // Premier niveau
      let components: any | any[] = [];

      if (
        typeof componentType === "string" &&
        !["#", "."].includes(componentType.charAt(0))
      ) {
        components = childs
          .filter((element) =>
            customElements.get(element.tagName.toLowerCase())
          )
          .filter((element) =>
            element.attributes.getNamedItem(`#${componentType}`)
          )
          .map((element) => {
            customElements.upgrade(element);
            return (element as unknown as ICustomerElement).component;
          });
      }

      if (
        typeof componentType === "function" &&
        componentType.prototype !== undefined
      ) {
        components = childs
          .filter((element) =>
            customElements.get(element.tagName.toLowerCase())
          )
          .map((element) => {
            customElements.upgrade(element);
            return (element as unknown as ICustomerElement).component;
          })
          .filter((component) => component.constructor === componentType);
      }

      if (components.length === 1) {
        object[propertyKey] = components[0];
      }

      if (components.length > 1) {
        object[propertyKey] = components;
      }
    };

    builders.push(viewChildBuilderFn);
  };
}

type ViewChildFn = (constructor: Constructor<any>) => any;

// Retournera un observer pour suivre les changement
export const viewChildFn: ViewChildFn = (constructor: Constructor<any>) => {
  viewChildSubject.subscribe(constructor, ...builders);
  builders = [];
};
