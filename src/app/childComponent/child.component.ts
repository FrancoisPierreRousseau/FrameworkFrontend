import { inject } from "inversify";
import { Component, ElementRef } from "../../core/components/component";
import { Renderer } from "../../core/render/renderer";
import { ViewChild } from "../../core/authoring/queries";
import { signal } from "../../core/render/reactivity.ref";

@Component({
  selector: "child-component",
  standalone: false,
  template: "child.component.html",
})
export class ChildComponent {
  @ViewChild(ChildComponent) childComponent!: ChildComponent; // Il ne peux s'utiliser lui même. Générer une erreur si on tente de le faire

  count = signal(0);

  constructor(
    @inject(ElementRef) public element: ElementRef<HTMLElement>,
    @inject(Renderer) public renderer: Renderer
  ) {}

  afterViewInit() {
    console.log(this.count);
  }
}
