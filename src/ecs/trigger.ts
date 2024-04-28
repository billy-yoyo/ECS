import { Component, getComponent, getComponentId } from "./component";
import { ECS, isECS, Module } from "./ecs";
import { Entity } from "./entity";

export type TriggerRunner<T> = { component: Component<T>, runner: (ecs: ECS, entity: Entity, oldValue: T) => void, name?: string };
export type Trigger = { id: number, module: number, name?: string };
export const Trigger = <T>(module: Module, component: Component<T>, func: (ecs: ECS, entity: Entity, oldValue: T, newValue: T) => void, name?: string): Trigger => {
    const runner = (ecs: ECS, entity: Entity, oldValue: T) => {
        const newValue = getComponent(ecs, entity, component);
        func(ecs, entity, oldValue, newValue);
    };
    const trigger: TriggerRunner<T> = { component, runner, name };
    return addTrigger(module, trigger);
};

export const GlobalTrigger = <T>(module: Module, component: Component<T>, func: (ecs: ECS, oldValue: T, newValue: T) => void, name?: string): Trigger => {
    if (!component.global) {
        throw new Error("can't attach global trigger to non-global component")
    }
    const runner = (ecs: ECS, entity: Entity, oldValue: T) => {
        const newValue = getComponent(ecs, entity, component);
        func(ecs, oldValue, newValue);
    };
    const trigger: TriggerRunner<T> = { component, runner, name };
    return addTrigger(module, trigger);
};

export const addTrigger = <T>(module: Module, runner: TriggerRunner<T>): Trigger => {
    const id = module.counters.trigger++;
    module.triggers[id] = runner;
    if (isECS(module)) {
        module.componentTriggers[getComponentId(module, runner.component)].push(id);
    }
    return { id, module: module.id, name: runner.name }
}

export const getTriggerId = (ecs: ECS, trigger: Trigger): number => {
    if (ecs.id === trigger.module) {
        return trigger.id;
    } else {
        const mappedId = ecs.moduleIdMap[trigger.module]?.systems[trigger.id];
        if (mappedId === undefined) {
            throw new Error(`Attempted to reference an unimported component ${trigger.name} within module ${ecs.name}`);
        } else {
            return mappedId;
        }
    }
}
