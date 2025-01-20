import { Container } from "inversify";
import {
  ComponentFactory,
  ComponentTemplateMetadata,
  IComponent,
} from "./components/component";
import { IServiceCollection } from "./services/service.collection";
import { Renderer } from "./render/renderer";

export type Constructor<T> = {
  new (...args: any[]): T;
  prototype: T;
};

export class Plateform {
  public services: IServiceCollection = new Container();
  private renderStrategy: RenderStrategy;

  constructor(
    private app: Constructor<IComponent>,
    renderStrategy?: RenderStrategy
  ) {
    this.services.bind(Renderer).toSelf().inSingletonScope();
    this.renderStrategy = renderStrategy || new DefaultRenderStrategy();
  }

  render(containerId: string) {
    this.renderStrategy.render(this.app, containerId);
  }
}

interface RenderStrategy {
  render(app: Constructor<IComponent>, containerId: string): void;
}

class DefaultRenderStrategy implements RenderStrategy {
  render(app: Constructor<IComponent>, containerId: string): void {
    const container = document.getElementById(containerId);

    if (!container) {
      throw new Error("Pas d'element trouvé");
    }

    const componentTemplateMetadata = new ComponentTemplateMetadata(app);

    const services = new Container();
    const componentBuilder = ComponentFactory.create(app, services);
    const componentRef = componentBuilder.build();
    componentRef.render();

    const appElement = document.createElement(
      componentTemplateMetadata.componentTemplate.selector
    );

    container.appendChild(appElement);
  }
}
