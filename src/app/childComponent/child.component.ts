import { inject } from "inversify";
import { Component, ElementRef } from "../../core/components/component";
import { Renderer } from "../../core/render/renderer";
import { ViewChild } from "../../core/authoring/queries";

@Component({
  selector: "child-component",
  standalone: false,
  template: "child.component.html",
})
export class ChildComponent {
  @ViewChild(ChildComponent) childComponent!: ChildComponent; // Ne marche pas encore actuellement

  constructor(
    @inject(ElementRef) public element: ElementRef<HTMLElement>,
    @inject(Renderer) public renderer: Renderer
  ) {}

  afterViewInit() {
    console.log(this.childComponent);
  }
}
