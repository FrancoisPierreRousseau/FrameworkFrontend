import { Container, interfaces } from "inversify";

export interface IInjector extends interfaces.Container {}

export class Injector extends Container {
  constructor(options?: interfaces.ContainerOptions) {
    options = { ...options, autoBindInjectable: true };
    super(options);
  }
}
