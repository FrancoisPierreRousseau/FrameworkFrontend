import { Container } from "inversify";
import {
  ComponentFactory,
  ComponentTemplateMetadata,
} from "./components/component";
import { registerComponent } from "./render/register.component";
import { EmbededViewRef, ComponentRef } from "./render/view.builder";
import { ServiceTest } from "../app/service.test";
import { ForDirective } from "./directives/for.directive";

export type Constructor<T> = {
  new (...args: any[]): T;
  prototype: T;
};

export class Plateform {
  private renderStrategy: RenderStrategy;

  constructor(private app: Constructor<any>, renderStrategy?: RenderStrategy) {
    this.renderStrategy = renderStrategy || new DefaultRenderStrategy();
  }

  render(containerId: string) {
    this.renderStrategy.render(this.app, containerId);
  }
}

interface RenderStrategy {
  render(app: Constructor<any>, containerId: string): void;
}

class DefaultRenderStrategy implements RenderStrategy {
  render(app: Constructor<any>, containerId: string): void {
    const container = document.getElementById(containerId);

    if (!container) {
      throw new Error("Pas d'element trouvé");
    }

    const services = new Container({ autoBindInjectable: true });
    services.bind(ForDirective).toSelf().inTransientScope();
    services.bind(ComponentRef).toSelf().inTransientScope();
    services.bind(EmbededViewRef).toSelf().inTransientScope();

    // test user service (plus tard serra dans provider)
    services.bind(ServiceTest).toSelf().inTransientScope();

    const componentTemplates = ComponentFactory.create(app);

    componentTemplates.forEach((template) => {
      services.bind(template.componentType).toSelf().inTransientScope();
    });

    componentTemplates.forEach((template) => {
      registerComponent(services, template);
    });

    const componentTemplateMetadata = new ComponentTemplateMetadata(app);

    const appElement = document.createElement(
      componentTemplateMetadata.componentTemplate.selector
    );

    container.appendChild(appElement);
  }
}
