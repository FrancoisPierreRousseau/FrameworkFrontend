import { inject } from "inversify";
import { ServiceTest } from "../../app/service.test";
import {
  CONTEXT_TOKEN,
  ElementRef,
  TemplateRef,
  ViewFactory,
} from "../render/view.builder";
import { Injector } from "../services/service.collection";
import { Signal } from "../render/reactivity.ref";
import { compileTemplate } from "../render/template.compiler";

export class ForDirective {
  private template: string;

  constructor(
    @inject(ElementRef) private elementRef: ElementRef<HTMLElement>,
    @inject(ViewFactory) private viewFactory: ViewFactory,
    @inject(CONTEXT_TOKEN) private parentContext: any,
    @inject(Injector) private servicesCollection: Injector,
    @inject(ServiceTest) private serviceTest: ServiceTest
  ) {
    this.template = `<template>${elementRef.nativeElement.innerHTML}</template>`;
  }

  apply(values: any): Node {
    this.elementRef.nativeElement.innerHTML = "";
    values.forEach((item: any, index: number) => {
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
          index,
        },
        this.servicesCollection
      );

      this.elementRef.nativeElement.appendChild(templateRef.element);
    });

    return this.elementRef.nativeElement;
  }
}
