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

  users = signal([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
    { name: "Charlie", age: 35 },
  ]);

  isDisabled = signal(false);

  constructor(@inject(ElementRef) private element: ElementRef<HTMLElement>) {}

  afterViewInit() {
    console.log(this.childComponent);
    // console.log(this.otherComponent);
  }

  // @Input() prop1, prop2...

  addUser() {
    this.users.update((users) => [...users, { name: "New User", age: 20 }]);
  }

  toggleDisableButton() {
    this.isDisabled.set(!this.isDisabled.get());
  }

  increment(event: Event) {
    this.countSignal.update((value) => value + 1);
    this.userSignal.set({ firstName: "firstName", lastName: "lastName" });
    this.addUser();
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
