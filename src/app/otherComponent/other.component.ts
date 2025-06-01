import { inject } from "inversify";
import { Component } from "../../core/components/component";
import { Renderer } from "../../core/render/renderer";
import { ChildComponent } from "../childComponent/child.component";
import { ViewChild } from "../../core/authoring/queries";
import { ElementRef, ViewFactory } from "../../core/render/view.builder";

@Component({
  selector: "other-component",
  standalone: false,
  template: "other.component.html",
  imports: [ChildComponent], // Générer une erreur si le ChildComponent est standalone
  // Si childComponent paas importé alors niet, je ne peux pas l'utiliser
})
export class OtherComponent {
  @ViewChild(ChildComponent) otherComponent!: ChildComponent; // Ne marche pas encore actuellement

  constructor(
    @inject(ElementRef) public element: ElementRef<HTMLElement>,
    @inject(Renderer) public renderer: Renderer,
    @inject(ViewFactory) public viewFactory: () => ViewFactory | null
  ) {
    // console.log(this.viewFactory());
  }

  afterViewInit() {
    // console.log(this.otherComponent);
    // console.log(this.viewFactory());
    // console.log(this.element.nativeElement);
  }
}
