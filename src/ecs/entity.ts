import { ECS } from "./ecs";

export type Entity = number;
export const Entity = (ecs: ECS) => {
    let id = ecs.counters.entity++;
    // search for next available id
    // this will only loop infinitely if the entire id register is taken simultaneously
    // which can be considered a catastrophic failure anyway
    while (ecs.entities[id]) {
        id++;
    }
    // holds the component ids this entity has
    ecs.entities[id] = [];
    return id;
}

export const deleteEntity = (ecs: ECS, entity: Entity) => {
    for (let cid in ecs.components) {
        delete ecs.components[cid][entity];
    }
    for (let cgid in ecs.componentGroups) {
        const index = ecs.componentGroups[cgid].indexOf(entity);
        if (index >= 0) {
            ecs.componentGroups[cgid].splice(index, 1);
        }
    }
    delete ecs.entities[entity];
};
