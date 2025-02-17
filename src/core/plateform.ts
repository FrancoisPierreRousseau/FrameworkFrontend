import { Container } from "inversify";
import {
  ComponentFactory,
  ComponentTemplateMetadata,
} from "./components/component";
import { Renderer } from "./render/renderer";
import { registerComponent } from "./render/register.component";
import { ListView, ViewContainer } from "./render/view.builder";

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
    services.bind(ListView).toSelf().inTransientScope();
    services.bind(ViewContainer).toSelf().inTransientScope();

    const componentTemplates = ComponentFactory.create(app);

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
