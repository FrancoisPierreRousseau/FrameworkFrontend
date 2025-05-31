import { TemplateRef, ViewFactory } from "../render/view.builder";

export class ForDirective {
  private viewFactory!: ViewFactory;
  private templateRef!: TemplateRef;

  constructor() {}

  useTemplateRef(templateRef: TemplateRef) {
    this.templateRef = templateRef;
  }

  useViewFactory(viewFactory: ViewFactory) {
    this.viewFactory = viewFactory;
  }

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
