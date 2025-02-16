import { Container, interfaces } from "inversify";

export interface IServiceCollection extends interfaces.Container {}

export class ServicesColletion extends Container {
  bind<T>(
    serviceIdentifier: interfaces.ServiceIdentifier<T>
  ): interfaces.BindingToSyntax<T> {
    if (!this.isBound(serviceIdentifier)) {
      return super.bind(serviceIdentifier);
    }

    return super.rebind(serviceIdentifier);
  }
}
