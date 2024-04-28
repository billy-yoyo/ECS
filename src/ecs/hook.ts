import { Module, ECS } from "./ecs";
import { getSystemId, System } from "./system";

export type Hook = { id: number, module: number, name?: string };
export const Hook = (module: Module, name?: string): Hook => {
    const id = module.counters.hook++;
    module.hooks[id] = [];
    return { id, module: module.id, name };
}

export const getHookId = (module: Module, hook: Hook): number => {
    if (module.id === hook.module) {
        return hook.id;
    } else {
        const mappedId = module.moduleIdMap[hook.module]?.hooks[hook.id];
        if (mappedId === undefined) {
            throw new Error(`Attempted to reference an unimported component ${hook.name} within module ${module.name}`);
        } else {
            return mappedId;
        }
    }
}

export const triggerHook = (ecs: ECS, hook: Hook) => {
    const systemIds = ecs.hooks[getHookId(ecs, hook)];
    systemIds.forEach(sid => {
        const system = ecs.systems[sid];
        system.runner(ecs)
    });
};

export const addSystemToHook = (ecs: ECS, hook: Hook, systemId: number, before: System[], after: System[]) => {
    const systems = ecs.hooks[getHookId(ecs, hook)];
    const maxIndex = Math.min(...before.map(s => systems.indexOf(getSystemId(ecs, s))).filter(index => index >= 0).concat([systems.length]));
    const minIndex = Math.max(...after.map(s => systems.indexOf(getSystemId(ecs, s))).filter(index => index >= 0).concat([-1]));
    if (minIndex >= maxIndex) {
        throw new Error('impossible to satisfy before and after requirements of the system');
    }
    systems.splice(minIndex + 1, 0, systemId);
}
