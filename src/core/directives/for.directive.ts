import { inject } from "inversify";

import {
  CONTEXT_TOKEN,
  TemplateRef,
  ViewFactory,
} from "../render/view.builder";
import { Injector } from "../services/service.collection";

export class ForDirective {
  constructor(
    @inject(ViewFactory) private viewFactory: ViewFactory,
    @inject(CONTEXT_TOKEN) private parentContext: any,
    @inject(Injector) private injector: Injector,
    @inject(TemplateRef) private templateRef: TemplateRef
  ) {}

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
