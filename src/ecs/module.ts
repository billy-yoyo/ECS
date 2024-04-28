import { isECS, Module } from "./ecs";
import { Component, GlobalComponent } from "./component";
import { Hook } from "./hook";
import { addSystem } from "./system";
import { addTrigger } from "./trigger";

const getOriginalId = (module: Module, mappedId: number, name: keyof Module['moduleIdMap'][number]) => {
    for (let [moduleId, idMaps] of Object.entries(module.moduleIdMap)) {
        const idMap = idMaps[name];
        const entry = Object.entries(idMap).find(([_, mid]) => mid === mappedId);
        if (entry) {
            return { id: Number(entry[0]), module: Number(moduleId) };
        }
    }
    return { id: mappedId, module: module.id };
}

const forwardOriginalId = (to: Module, from: Module, mappedId: number, name: keyof Module['moduleIdMap'][number], createNew: () => number) => {
    const original = getOriginalId(from, mappedId, name);
    if (!to.moduleIdMap[original.module]) {
        to.moduleIdMap[original.module] = {components: {}, systems: {}, hooks: {}, triggers: {}};
    }
    // only foward the element if a copy of it hasn't already been imported
    if (to.moduleIdMap[original.module][name][original.id] === undefined) {
        to.moduleIdMap[original.module][name][original.id] = createNew();
    }
}

export const importModule = (to: Module, from: Module) => {
    if (isECS(from)) {
        throw new Error('cannot import an ecs into another ecs, must use modules');
    }

    if (to.imported.includes(from.id)) {
        // import should be idempotent
        return;
    }

    from.dependencies.forEach(dependancy => importModule(to, dependancy));

    to.moduleIdMap[from.id] = {components: {}, systems: {}, hooks: {}, triggers: {}};
  
    from.componentIds.forEach(cid => {
        forwardOriginalId(to, from, cid, 'components', () => Component(to).id);
    });

    from.globalComponentIds.forEach(cid => {
        forwardOriginalId(to, from, cid, 'components', () =>  GlobalComponent(to, from.globalComponents[cid]).id);
    })

    Object.keys(from.hooks).map(Number).forEach(hid => {
        forwardOriginalId(to, from, hid, 'hooks', () => Hook(to).id);
    });

    Object.entries(from.systems).forEach(([key, runner]) => {
        forwardOriginalId(to, from, Number(key), 'systems', () => addSystem(to, runner).id);
    });

    Object.entries(from.triggers).forEach(([key, runner]) => {
        forwardOriginalId(to, from, Number(key), 'triggers', () => addTrigger(to, runner).id);
    });

    to.imported.push(from.id);
    from.imported.forEach(id => {
        if (!to.imported.includes(id)) {
            to.imported.push(id)
        }
    });
}

export const addDependancy = (target: Module, dependancy: Module) => {
    target.dependencies.push(dependancy);
}
