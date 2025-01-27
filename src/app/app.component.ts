import { inject } from "inversify";
import { Component, ElementRef, ViewChild } from "../core/components/component";
import { ChildComponent } from "./childComponent/child.component";

// Import pour importer des Component (non standalone)
// Si standalone alors on injecte globalement dans la Plateforme.
@Component({
  selector: "app-main",
  template: "app.component.html",
  standalone: false,
  imports: [ChildComponent], // Générer une erreur si le ChildComponent est standalone
})
export class AppComponent {
  @ViewChild(ChildComponent) childComponent!: ChildComponent; // Ne marche pas encore actuellement

  constructor(@inject(ElementRef) private element: ElementRef<HTMLElement>) {}

  afterViewInit() {
    console.log(this.childComponent);
    console.log("App component render");
  }

  // @Input() prop1, prop2...

  static defineProps() {
    return {
      selectorName: {
        // Props et serra récupérer dans le composant endant
      },
    };
  }
}
