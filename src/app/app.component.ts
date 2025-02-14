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

  // Pour l'instant, chaque valeur d'un tableau doit posséder des signaux...
  users = signal([
    {
      name: signal("Alice"),
      age: signal(30),
      complexObj: signal({
        prop1: "prop 1",
      }),
    },
    {
      name: signal("Bob"),
      age: signal(25),
      complexObj: signal({
        prop1: "prop 2",
      }),
    },
    {
      name: signal("Charlie"),
      age: signal(35),
      complexObj: signal({
        prop1: "prop 3",
      }),
    },
  ]);

  isDisabled = signal(true);

  constructor(@inject(ElementRef) private element: ElementRef<HTMLElement>) {}

  afterViewInit() {
    // console.log(this.childComponent);
    // console.log(this.otherComponent);
  }

  // @Input() prop1, prop2...

  addUser() {
    this.users.update((users) => [
      ...users,
      {
        name: signal("New User"),
        age: signal(20),
        complexObj: signal({
          prop1: "prop4",
        }),
      },
    ]);

    this.users.update((users) => {
      users[0] = {
        age: signal(30),
        name: signal("Jacob"),
        complexObj: signal({ prop1: "new prop" }),
      };
      return users;
    });
  }

  toggleDisableButton() {
    this.isDisabled.set(!this.isDisabled.get());
  }

  mouseenter(event: MouseEvent) {
    console.log("mouse is enter");
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
}
