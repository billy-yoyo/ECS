import { ECS, isECS, Module } from "./ecs";
import { Entity } from "./entity";

export interface Component<T> {
    id: number;
    global: boolean;
    module: number;
    data?: T;
    name?: string;
}

export type Struct<C extends Component<any>> = C extends Component<infer T> ? T : never; 

export const Component = <T>(module: Module, global: boolean = false, name?: string): Component<T> => {
    const id = module.counters.component++;
    if (global) {
        module.globalComponentIds.push(id);
    } else {
        module.componentIds.push(id);
    }
    
    if (isECS(module) && !global) {
        module.components[id] = {};
        module.componentGroupMemberships[id] = [];
        module.componentTriggers[id] = [];
    }
    return { id, module: module.id, global, name };
}

const createGroupKey = (cids: number[]): string => {
    return cids.join(':');
}

export const getComponentId = (module: Module, component: Component<any>): number => {
    if (module.id === component.module) {
        return component.id;
    } else {
        const mappedId = module.moduleIdMap[component.module]?.components[component.id];
        if (mappedId === undefined) {
            throw new Error(`Attempted to reference an unimported component ${component.name} within module ${module.name}`);
        } else {
            return mappedId;
        }
    }
}

export const getComponentGroupKey = (module: Module, components: Component<any>[]): string => {
    return createGroupKey(components.filter(c => !c.global).map(c => getComponentId(module, c)).sort());
}

export const getComponentGroupByKey = (ecs: ECS, key: string): number[] => {
    if (key === '') {
        return Object.keys(ecs.entities).map(Number);
    } else {
        return ecs.componentGroups[key] || [];
    }
}

export const getComponentGroup = (ecs: ECS, components: Component<any>[]): number[] => {
    const key = getComponentGroupKey(ecs, components);
    return getComponentGroupByKey(ecs, key);
}

const deleteValue = (arr: any[], val: any) => {
    const index = arr.indexOf(val);
    if (index >= 0) {
        arr.splice(index, 1);
    }
}

export const addComponent = <T>(ecs: ECS, entity: Entity, component: Component<T>, value: T) => {
    if (value === undefined) {
        removeComponent(ecs, entity, component);
        return;
    }

    const componentId = getComponentId(ecs, component);
    let oldValue: T;

    if (component.global) {
        oldValue = ecs.globalComponents[componentId];
        ecs.globalComponents[componentId] = value;
    } else {
        oldValue = ecs.components[componentId][entity];
        ecs.components[componentId][entity] = value;

        // is a new addition to the component
        if (oldValue === undefined) {
            ecs.entities[entity].push(componentId);

            const cids = ecs.entities[entity];
            ecs.componentGroupMemberships[componentId]
                .filter(m => {
                    const validEntityMembership = m.every(cid => cids.includes(cid));
                    const group = ecs.componentGroups[createGroupKey(m)];
                    const validGroup = !group || !group.includes(entity);
                    return validEntityMembership && validGroup;
                })
                .forEach(m => {
                    const key = createGroupKey(m);
                    const group = ecs.componentGroups[key];
                    if (group) {
                        group.push(entity);
                    } else {
                        ecs.componentGroups[key] = [entity];
                    }
                });
        }
    }

    // check for triggers
    const triggers = ecs.componentTriggers[componentId];
    if (triggers && triggers.length) {
        triggers.forEach(tid => ecs.triggers[tid].runner(ecs, entity, oldValue))
    }
}

export const updatedComponent = <T>(ecs: ECS, entity: Entity, component: Component<T>): void => {
    addComponent(ecs, entity, component, getComponent(ecs, entity, component));
}

export const getComponent = <T>(ecs: ECS, entity: Entity, component: Component<T>): T => {
    if (component.global) {
        return ecs.globalComponents[getComponentId(ecs, component)] as T;
    } else {
        return ecs.components[getComponentId(ecs, component)][entity] as T;
    }
}

export const removeComponent = <T>(ecs: ECS, entity: Entity, component: Component<T>): void => {
    const componentId = getComponentId(ecs, component);
    let oldValue: T;

    if (component.global) {
        oldValue = ecs.globalComponents[componentId];
        delete ecs.globalComponents[componentId];
    } else {
        oldValue = ecs.components[componentId][entity];
        delete ecs.components[componentId][entity];

        // is a deletion from the components
        if (oldValue !== undefined) {
            ecs.componentGroupMemberships[componentId]
                .forEach(m => {
                    const group = ecs.componentGroups[createGroupKey(m)];
                    if (group) {
                        deleteValue(group, entity);
                    }
                })
        }

        deleteValue(ecs.entities[entity], componentId);
    }

    // check for triggers
    const triggers = ecs.componentTriggers[componentId];
    if (triggers && triggers.length) {
        triggers.forEach(tid => ecs.triggers[tid].runner(ecs, entity, oldValue))
    }
}

export const hasComponent = <T>(ecs: ECS, entity: Entity, component: Component<T>): boolean => {
    if (component.global) {
        return ecs.globalComponents[getComponentId(ecs, component)] !== undefined;
    } else {
        return ecs.components[getComponentId(ecs, component)][entity] !== undefined;
    }
}

export const GlobalComponent = <T>(module: Module, value?: T): Component<T> => {
    const component = Component<T>(module, true);
    if (value) {
        module.globalComponents[getComponentId(module, component)] = value;
    }
    return component;
}

export const addGlobalComponent = <T>(module: Module, component: Component<T>, value: T) => {
    if (component.global) {
        module.globalComponents[getComponentId(module, component)] = value;
    }
}

export const getGlobalComponent = <T>(module: Module, component: Component<T>): T => {
    if (component.global) {
        return module.globalComponents[getComponentId(module, component)] as T;
    }
}

export class ComponentHandler {
    private ecs: ECS;
    private entity?: Entity;

    constructor(ecs: ECS, entity?: Entity) {
        this.ecs = ecs;
        this.entity = entity;
    }

    get<T>(component: Component<T>): T {
        return getComponent(this.ecs, this.entity, component);
    }

    add<T>(component: Component<T>) {
        return (value: T) => {
            addComponent(this.ecs, this.entity, component, value);
        }
    }

    remove<T>(component: Component<T>) {
        removeComponent(this.ecs, this.entity, component);
    }

    has<T>(component: Component<T>) {
        return hasComponent(this.ecs, this.entity, component);
    }
}

export const GlobalComponentHandler = (ecs: ECS) => new ComponentHandler(ecs);
export const EntityComponentHandler = (ecs: ECS, entity: Entity = undefined) => {
    if (entity === undefined) {
        entity = Entity(ecs);
    }
    return new ComponentHandler(ecs, entity)
};
