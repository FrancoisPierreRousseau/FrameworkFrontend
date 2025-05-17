export interface CompiledTemplate {
  template: DocumentFragment;
  bindings: BindingInstruction[];
}

export type BindingInstruction =
  | { type: "text"; node: Text; expression: string }
  | { type: "attr"; node: Element; attr: string; expression: string }
  | { type: "event"; node: Element; event: string; handler: string }
  | { type: "directive"; node: Element; directive: string; expression: string };

export function compileTemplate(raw: string): CompiledTemplate {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");
  const templateEl = doc.querySelector("template");
  const fragment = templateEl!.content.cloneNode(true) as DocumentFragment;

  const bindings: BindingInstruction[] = [];

  const walk = (node: Node) => {
    if (
      node.nodeType === Node.TEXT_NODE &&
      /{{(.*?)}}/.test(node.textContent || "")
    ) {
      bindings.push({
        type: "text",
        node: node as Text,
        expression: node.textContent!.match(/{{(.*?)}}/)![1].trim(),
      });
    }

    if (node instanceof HTMLElement) {
      [...node.attributes].forEach((attr) => {
        if (attr.name.startsWith("[")) {
          bindings.push({
            type: "attr",
            node,
            attr: attr.name.slice(1, -1),
            expression: attr.value,
          });
        } else if (attr.name.startsWith("(")) {
          bindings.push({
            type: "event",
            node,
            event: attr.name.slice(1, -1),
            handler: attr.value,
          });
        } else if (attr.name.startsWith("*")) {
          bindings.push({
            type: "directive",
            node,
            directive: attr.name,
            expression: attr.value,
          });
        }
      });
    }

    node.childNodes.forEach(walk);
  };

  walk(fragment);

  return { template: fragment, bindings };
}
