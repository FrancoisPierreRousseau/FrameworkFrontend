import { inject } from "inversify";
import { ServiceTest } from "../../app/service.test";
import {
  CONTEXT_TOKEN,
  ElementRef,
  TemplateRef,
  ViewFactory,
} from "../render/view.builder";
import { Injector } from "../services/service.collection";

export class ForDirective {
  constructor(
    @inject(ElementRef) private elementRef: ElementRef<HTMLElement>,
    @inject(ViewFactory) private viewFactory: ViewFactory,
    @inject(CONTEXT_TOKEN) private parentContext: any,
    @inject(Injector) private injector: Injector,
    @inject(TemplateRef) private templateRef: TemplateRef
  ) {}

  apply(values: any) {
    this.elementRef.nativeElement.innerHTML = "";

    values.forEach((item: any, index: number) => {
      this.viewFactory.createEmbededView(
        this.templateRef,
        {
          ...this.parentContext,
          ...item,
          index,
        },
        this.injector
      );

      // Cela doit être le viewFactory qui doit gérer cette opération
      // le ShadowRoot devrait se trouver au sein du ElementRef ?. Ou trouver un mecanisme pour
      // pour abstraite tout cela
      this.elementRef.nativeElement.appendChild(this.templateRef.element);
    });
  }
}
