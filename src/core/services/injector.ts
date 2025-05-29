import { Container, interfaces } from "inversify";

export interface IInjector extends interfaces.Container {}

export class Injector extends Container {}
