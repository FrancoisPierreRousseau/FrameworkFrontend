import { inject } from "inversify";

import {
  CONTEXT_TOKEN,
  TemplateRef,
  ViewFactory,
} from "../render/view.builder";
import { Injector } from "../services/injector";

export class ForDirective {
  private viewFactory!: ViewFactory;
  private templateRef!: TemplateRef;

  constructor(
    @inject(CONTEXT_TOKEN) private parentContext: any, // Dot utiliser le host donc le component parenttss
    @inject(Injector) private injector: Injector
  ) {}

  useTemplateRef(templateRef: TemplateRef) {
    this.templateRef = templateRef;
  }

  useViewFactory(viewFactory: ViewFactory) {
    this.viewFactory = viewFactory;
  }

  apply(values: any) {
    this.viewFactory.clear();

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
    });
  }
}
