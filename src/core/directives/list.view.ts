import { inject } from "inversify";
import { ServiceTest } from "../../app/service.test";
import {
  CONTEXT_TOKEN,
  ElementRef,
  TemplateRef,
  ViewFactory,
} from "../render/view.builder";
import { ServicesColletion } from "../services/service.collection";
import { Signal } from "../render/reactivity.ref";
import { compileTemplate } from "../render/template.compiler";

export class ListView {
  private template: string;

  constructor(
    @inject(ElementRef) private elementRef: ElementRef<HTMLElement>,
    @inject(ViewFactory) private viewFactory: ViewFactory,
    @inject(CONTEXT_TOKEN) private parentContext: any,
    @inject(ServicesColletion) private servicesCollection: ServicesColletion,
    @inject(ServiceTest) private serviceTest: ServiceTest
  ) {
    this.template = `<template>${elementRef.nativeElement.innerHTML}</template>`;
  }

  create(signal: any): Node {
    if (signal instanceof Signal) {
      const update = () => {
        this.elementRef.nativeElement.innerHTML = "";
        signal.get().forEach((item: any) => {
          const templateCompiled = compileTemplate(this.template);

          const templateRef = new TemplateRef(
            templateCompiled.template,
            templateCompiled.bindings
          );

          this.viewFactory.createEmbededView(
            templateRef,
            {
              ...this.parentContext,
              ...item,
            },
            this.servicesCollection
          );

          this.elementRef.nativeElement.appendChild(templateRef.element);
        });
      };
      signal.subscribe(update);
      update();
    }

    return this.elementRef.nativeElement;
  }
}
