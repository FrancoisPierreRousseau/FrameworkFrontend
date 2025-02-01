// Retournera un ViewChildBuilder.
// Il agrégera ordenera, structurera les childs (ref, classe ectect..)
// Il prendre le elementRef dans le constructeur au cas ou pour la selection par classe, id ect...

import { Constructor, ElementRef } from "../components/component";

// En gros via un querySelectorAll. Si un element, un element sinon un tableau
export type ViewChildBuilderFn = (
  childs: Map<ElementRef<HTMLElement>, any>,
  rootRef: ElementRef<HTMLElement>
) => void;

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

  notify(
    componentType: Constructor<any>,
    childs: Map<ElementRef<HTMLElement>, any>,
    elementRef: ElementRef<HTMLElement>
  ) {
    const observers = this.observers.get(componentType) || [];
    observers.forEach((observer) => observer(childs, elementRef));
  }
}

export const viewChildSubject = new ViewChildSubject();

export function ViewChild(componentType: Constructor<any>) {
  return function defineViewChild(
    object: { [key: string]: any },
    propertyKey: string
  ) {
    object[propertyKey] = null;

    const viewChildBuilderFn: ViewChildBuilderFn = (childViews, rootRef) => {
      const components: any[] = [];

      [...childViews.entries()].forEach(([childRef, element]) => {
        if (
          (childRef.nativeElement.getRootNode() as ShadowRoot).host ===
          rootRef.nativeElement
        ) {
          components.push(element);
        }
      });

      if (
        typeof componentType === "function" &&
        componentType.prototype !== undefined
      ) {
        const childsComponent = components.filter(
          (component) => component.constructor === componentType
        );

        if (childsComponent.length === 1) {
          object[propertyKey] = childsComponent[0];
        }

        if (childsComponent.length > 1) {
          object[propertyKey] = childsComponent;
        }
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
