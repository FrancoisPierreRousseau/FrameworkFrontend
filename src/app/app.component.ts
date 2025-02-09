import { inject } from "inversify";
import { Component, ElementRef } from "../core/components/component";
import { ChildComponent } from "./childComponent/child.component";
import { OtherComponent } from "./otherComponent/other.component";
import { ViewChild } from "../core/authoring/queries";
import { signal } from "../core/render/reactivity.ref";

interface User {
  firstName: string;
  lastName: string;
}

// Import pour importer des Component (non standalone)
// Si standalone alors on injecte globalement dans la Plateforme.
@Component({
  selector: "app-main",
  template: "app.component.html",
  standalone: false,
  imports: [ChildComponent, OtherComponent], // Générer une erreur si le ChildComponent est standalone
})
export class AppComponent {
  @ViewChild("secondchild") childComponent!: ChildComponent;
  @ViewChild(OtherComponent) otherComponent!: OtherComponent;

  countSignal = signal(0);
  userSignal = signal<User>({
    firstName: "firstName",
    lastName: "lastName",
  });

  constructor(@inject(ElementRef) private element: ElementRef<HTMLElement>) {}

  afterViewInit() {
    console.log(this.childComponent);
    // console.log(this.otherComponent);
  }

  // @Input() prop1, prop2...

  increment(event: Event) {
    this.countSignal.update((value) => value + 1);
    this.userSignal.set({ firstName: "firstName", lastName: "lastName" });
  }

  increment2(event: Event) {
    this.countSignal.update((value) => value + 1);
    this.userSignal.set({ firstName: "lastName", lastName: "firstName" });
  }

  static defineProps() {
    return {
      selectorName: {
        // Props et serra récupérer dans le composant endant
      },
    };
  }
}
