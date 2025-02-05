import { inject } from "inversify";
import { Component, ElementRef } from "../core/components/component";
import { ChildComponent } from "./childComponent/child.component";
import { OtherComponent } from "./otherComponent/other.component";
import { ViewChild } from "../core/authoring/queries";

// Import pour importer des Component (non standalone)
// Si standalone alors on injecte globalement dans la Plateforme.
@Component({
  selector: "app-main",
  template: "app.component.html",
  standalone: false,
  imports: [ChildComponent, OtherComponent], // Générer une erreur si le ChildComponent est standalone
})
export class AppComponent {
  @ViewChild("secondchild") childComponent!: ChildComponent; // Ne marche pas encore actuellement
  @ViewChild(OtherComponent) otherComponent!: OtherComponent;

  private count: number = 0;

  constructor(@inject(ElementRef) private element: ElementRef<HTMLElement>) {}

  afterViewInit() {
    console.log(this.childComponent);
    // console.log(this.otherComponent);
  }

  // @Input() prop1, prop2...

  increment() {
    this.count++;
    console.log(this.count);
  }

  static defineProps() {
    return {
      selectorName: {
        // Props et serra récupérer dans le composant endant
      },
    };
  }
}
