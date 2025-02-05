import { ComponentTemplate } from "../components/component";
import { EventKey, Renderer } from "../render/renderer";

export class Compiler {
  constructor(
    private readonly componentTemplate: ComponentTemplate,
    private readonly component: any,
    private readonly renderer: Renderer
  ) {}

  compile() {
    const parser = new DOMParser();
    const element = parser
      .parseFromString(this.componentTemplate.template, "text/html")
      .querySelector("template");

    if (!element) {
      throw new Error("un probléme");
    }

    element.content.querySelectorAll(":defined").forEach((node) => {
      const attrEvents = [...node.attributes].filter((attr) =>
        /^\(.*\)$/.test(attr.localName)
      );

      attrEvents.forEach((attr) => {
        const event = attr.localName.slice(1, attr.localName.length - 1);
        const methode = attr.value;
        if (
          !(methode in this.component) &&
          typeof this.component[methode] !== "function"
        ) {
          throw new Error(
            "pas de methode associé trouver un bon message d'erreur "
          );
        }

        this.renderer.listen(
          node as HTMLElement,
          event as EventKey,
          this.component[methode].bind(this.component)
        );

        node.removeAttributeNode(attr);
      });
    });

    return element.content;
  }
}
