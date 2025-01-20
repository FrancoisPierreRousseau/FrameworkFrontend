import { inject } from "inversify";
import { Component, ElementRef } from "../../core/components/component";

@Component({
  selector: "child-component",
  standalone: false,
  template: "child.component.html",
})
export class ChildComponent {
  constructor(@inject(ElementRef) public element: ElementRef<HTMLElement>) {}

  afterViewInit() {
    console.log("child-component");
  }
}
