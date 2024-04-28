import { Module, ECS, isECS } from "./ecs";
import { Component, getComponent, getComponentGroupByKey, getComponentGroupKey, getComponentId, hasComponent } from "./component";
import { addSystemToHook, getHookId, Hook } from "./hook";
import { Entity } from "./entity";

// TODO: consider adding more complicated query support, e.g. component exclusion 

type RemoveNames<T extends any[]> = [any, ...T] extends [any, ...infer U] ? U : never
type ComponentList<T extends any[]> = {[K in keyof T]: Component<T[K]>};
type AdvancedQuery<T extends any[]> = { with: ComponentList<T>; without?: ComponentList<any[]>, before?: System[], after?: System[] };
type Query<T extends any[]> = ComponentList<T> | AdvancedQuery<T>;

const isAdvancedQuery = <T extends any[]>(q: Query<T>): q is AdvancedQuery<T> => {
    return (q as any).with !== undefined && typeof (q as any).with !== "function";
}

const asComponentList = <T extends any[]>(cl: ComponentList<T>): Component<any>[] => {
    return cl as any as Component<any>[];
};

export type System = { id: number, module: number, name?: string };
export type SystemRunner = { runner: (ecs: ECS) => void; hook: Hook; query: Query<any>; name?: string; before: System[], after: System[] };
export const System = <T extends any[]>(module: Module, hook: Hook, query: Query<RemoveNames<T>>, func: (ecs: ECS, entity: Entity, ...args: T) => void, name?: string): System => {
    const components = asComponentList(isAdvancedQuery(query) ? query.with : query);
    const negatedComponents = asComponentList(isAdvancedQuery(query) ? query.without : undefined);

    const systemRunner = (ecs: ECS) => {
        const key = getComponentGroupKey(ecs, components);
        const entityIds = getComponentGroupByKey(ecs, key);
        entityIds.forEach(eid => {
            if (!negatedComponents || negatedComponents.every(c => !hasComponent(ecs, eid, c))) {
                func(ecs, eid, ...(components.map(c => getComponent(ecs, Number(eid), c)) as any as T));
            }
        });
    };
    const before = isAdvancedQuery(query) ? query.before || [] : [];
    const after = isAdvancedQuery(query) ? query.after || [] : [];
    const runner: SystemRunner = { runner: systemRunner, query: query as any, hook, name, before, after };

    return addSystem(module, runner);
};

export const GlobalSystem = (module: Module, hook: Hook, func: (ecs: ECS) => void, name?: string): System => {
    const runner: SystemRunner = { runner: func, query: undefined, hook, name, before: [], after: [] };
    return addSystem(module, runner);
}

export const addSystem = (module: Module, runner: SystemRunner): System => {
    const id = module.counters.system++;
    
    if (isECS(module)) {
        if (runner.query) {
            registerSystem(module, runner);
        }
        addSystemToHook(module, runner.hook, id, runner.before, runner.after);
    }

    module.systems[id] = runner;
    return { id, module: module.id, name: runner.name };
}

export const getSystemId = (ecs: ECS, system: System): number => {
    if (ecs.id === system.module) {
        return system.id;
    } else {
        const mappedId = ecs.moduleIdMap[system.module]?.systems[system.id];
        if (mappedId === undefined) {
            throw new Error(`Attempted to reference an unimported component ${system.name} within module ${ecs.name}`);
        } else {
            return mappedId;
        }
    }
}

export const registerSystem = (ecs: ECS, runner: SystemRunner) => {
    const components = asComponentList(isAdvancedQuery(runner.query) ? runner.query.with : runner.query);
    const entityComponents = components.filter(c => !c.global);

    const key = getComponentGroupKey(ecs, components);
    ecs.componentGroups[key] = [];

    // we need to check if any entities already exist satisfying this query
    Object.entries(ecs.entities).forEach(([entity, cids]) => {
        if (entityComponents.every(c => cids.includes(getComponentId(ecs, c)))) {
            ecs.componentGroups[key].push(Number(entity));
        }
    });
    
    const cids = entityComponents.map(c => getComponentId(ecs, c)).sort();
    entityComponents.forEach(c => {
        const memberships = ecs.componentGroupMemberships[getComponentId(ecs, c)];
        if (!memberships.some(m => m.length === cids.length && m.every((cid, i) => cid === cids[i]))) {
            memberships.push(cids);
        }
    });
}
