import { Container, interfaces } from "inversify";

export interface IInjector extends interfaces.Container {}

export class Injector extends Container {
  bind<T>(
    serviceIdentifier: interfaces.ServiceIdentifier<T>
  ): interfaces.BindingToSyntax<T> {
    if (!this.isCurrentBound(serviceIdentifier)) {
      return super.bind(serviceIdentifier);
    }

    return super.rebind(serviceIdentifier);
  }
}
