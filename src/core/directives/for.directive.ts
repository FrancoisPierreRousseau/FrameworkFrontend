import { inject } from "inversify";
import { TemplateRef, ViewFactory } from "../render/view.builder";

export class ForDirective {
  constructor(
    @inject(ViewFactory) private viewFactory: ViewFactory,
    @inject(TemplateRef) private templateRef: TemplateRef
  ) {}

  apply(values: any) {
    this.viewFactory.clear();

    values.forEach((item: any, index: number) => {
      this.viewFactory.createEmbededView(this.templateRef, {
        ...item,
        index,
      });
    });
  }
}
