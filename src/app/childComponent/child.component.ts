import { inject } from "inversify";
import {
  Component,
  ElementRef,
  ViewChild,
} from "../../core/components/component";

@Component({
  selector: "child-component",
  standalone: false,
  template: "child.component.html",
})
export class ChildComponent {
  @ViewChild(ChildComponent) childComponent!: ChildComponent; // Ne marche pas encore actuellement

  constructor(@inject(ElementRef) public element: ElementRef<HTMLElement>) {}

  afterViewInit() {
    console.log("child-component");
  }
}
