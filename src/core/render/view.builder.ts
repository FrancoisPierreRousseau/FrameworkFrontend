import { DOMBinder, Signal } from "./reactivity.ref";

interface IView {
  create(component: any, domBinder: DOMBinder): Node;
}

abstract class AbstractView implements IView {
  protected element: Node;

  constructor(element: Node) {
    this.element = element;
  }

  abstract create(component: any, domBinder: DOMBinder): Node;
}

class SimpleView extends AbstractView {
  create(component: any, domBinder: DOMBinder): Node {
    domBinder.bind(this.element, component);
    return this.element;
  }
}

// Correspondra à une directive structurel
class ListView extends AbstractView {
  private template: string;
  private forAttr: string;

  // Seront passé surement par injection de dépendance (au moi le domBinder à minima)
  constructor(element: HTMLElement, private domBinder: DOMBinder) {
    super(element);
    this.template = element.innerHTML;
    this.forAttr = element.getAttribute("*for") || "";
    element.removeAttribute("*for");
  }

  create(component: any, domBinder: DOMBinder): Node {
    const signal = component[this.forAttr];

    if (signal instanceof Signal) {
      const update = () => {
        (this.element as HTMLElement).innerHTML = "";

        signal.get().forEach((item: any) => {
          const templateElement = document.createElement("template");
          templateElement.innerHTML = this.template;
          const view = ViewFactory.createView(
            templateElement.content,
            this.domBinder
          );
          const node = view.create({ ...component, ...item }, domBinder);
          domBinder.bind(node, { ...component, ...item });
          this.element.appendChild(node);
        });
      };
      signal.subscribe(update);
      update();
    }

    return this.element;
  }
}

class CompositeView extends AbstractView {
  private children: IView[] = [];

  addChild(child: IView) {
    this.children.push(child);
  }

  create(component: any, domBinder: DOMBinder): Node {
    this.children.forEach((child) => child.create(component, domBinder));
    return this.element;
  }
}

// GROSSE REFLEXION LE ':DEFINED' RETOURNE DEJA TOUT LES NODES. PAS BESOIN DE RECUSIVITE
// CELA SIMPLIFIERA ENORMEMENT LE CODE ET LA SEPERATION DES DIRECTIVES STRUCTUREL DU PROCESSUS D'EXECUTION NOMINAL.
// PAS BESOIN DE RECALCULE
export class ViewFactory {
  static createView(node: Node, domBinder: DOMBinder): IView {
    if (node instanceof HTMLElement && node.hasAttribute("*for")) {
      // Ici cela serra les directive structurel à utiliser manipuler ect ect
      // Peut être que cela représentera un viewContainerRef avec lequel je manipulerai
      // pour implémenter la structure
      // Toujours aller vers une code plus SOLID. Toujours suivre SOLID
      return new ListView(node, domBinder);
    } else if (
      (node instanceof HTMLElement || node instanceof DocumentFragment) &&
      node.querySelectorAll(":defined").length > 0
    ) {
      const compositeView = new CompositeView(node);
      node.querySelectorAll(":defined").forEach((child) => {
        compositeView.addChild(this.createView(child, domBinder));
      });
      return compositeView;
    } else {
      return new SimpleView(node);
    }
  }
}
