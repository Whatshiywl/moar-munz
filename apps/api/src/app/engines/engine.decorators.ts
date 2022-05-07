import { Injectable, InjectableOptions } from "@nestjs/common";

export const ENGINE_METADATA = 'ENGINE_METADATA';

export const GEAR_METADATA = 'GEAR_METADATA';
export const GEAR_MESSAGE_METADATA = 'GEAR_MESSAGE_METADATA';

export const Engine = (options?: InjectableOptions) => {
  return (target: Function) => {
    Reflect.defineMetadata(ENGINE_METADATA, true, target);
    Injectable(options)(target);
  };
};

export const Gear = (message: string) => {
  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(GEAR_METADATA, true, descriptor.value);
    Reflect.defineMetadata(GEAR_MESSAGE_METADATA, message, descriptor.value);
  };
};
