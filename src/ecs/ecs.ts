import { SystemRunner } from "./system";
import { Trigger, TriggerRunner } from "./trigger";

const ECSCounter = (() => {
  let count = 0;
  return () => count++;
})();

/*
Explaination of how component groups are managed:
  * When an entity is created, an entry is created in `entities` with an empty array
  * When an entity component (i.e. non-global) is created, an entry is created in `componentGroupMemberships` with an empty array
  * When a system is created, the following happens:
    * An entry is created in `componentGroups` under the key for the system's query with an empty array
    * The ids for this group are added to each of the group members' `componentGroupMemberships`
    * For example, if a system acts on components C1 and C2, then `componentsGroups["C1:C2"] = []` will be created, and 
      `componentGroupMemberships[C1].push([C1, C2])` `componentGroupMemberships[C2].push([C1, C2]) will also be created
  * When a component is added to a specific entity, the entity id is added to component groups by finding the new groups 
    using `componentGroupMemberships` of the new component
  * When a component is removed from a specific entity, the entity id is removed from all component groups using `componentGroupMemberships` of the new component
  * When a system is run, it just needs to look under `componentGroups` with the key it generated at creation time to find the list of entites to run against

This offloads a much of the pressure from run-time as possible, mainly by doing the following:
  * Avoiding manual entity id lookup at system runtime by utilizing `componentGroups`
  * Avoiding costly recursive group membership checks when adding large amounts of components to an entity by utilizing `componentGroupMemberships`
  * Offload as much of the calculation to component/system creation-time as possible, since this is a one-time computation
*/
export interface Module {
    id: number;
    name?: string;
    // id counters
    counters: {
        entity: number;
        component: number;
        system: number;
        hook: number;
        trigger: number;
    }

    // TODO: add modules

    componentIds: number[];
    globalComponentIds: number[];

    // maps global component ids to their values
    globalComponents: {[component: number]: any};
    // maps system ids to their execution function
    systems: {[system: number]: SystemRunner};
    // maps hook ids to a list of system ids
    hooks: {[hook: number]: number[]};
    // maps trigger ids to their execution function
    triggers: {[trigger: number]: TriggerRunner<any>};
    
    // maps ecs ids to ECS instances
    moduleIdMap: {
      [module: number]: {
        components: {[component: number]: number},
        systems: {[system: number]: number},
        hooks: {[hook: number]: number},
        triggers: {[trigger: number]: number}
      }
    },
    dependencies: Module[];
    imported: number[];
}

export interface ECS extends Module {
  // maps entity ids to a list of their component ids
  entities: {[entity: number]: number[]};
  // maps component ids to a map of entity ids to their component value
  components: {[component: number]: {[entity: number]: any}};
  // key is formatted as "c1:...:cn" where c1, ..., cn are component ids sorted ascending
  // maps this key to a list of entity ids who have all components c1, ..., cn
  componentGroups: {[key: string]: number[]};
  // maps component ids to a list of component groups they belong to
  componentGroupMemberships: {[component: number]: number[][]};
  // maps component ids to a list of trigger ids that are triggered then this component is changed
  componentTriggers: {[component: number]: number[]};
}

export const isECS = (module: Module): module is ECS => {
  return (module as ECS).entities !== undefined;
}

export const Module = (name?: string): Module => {
  return {
    id: ECSCounter(),
    name,
    counters: { entity: 0, component: 0, system: 0, hook: 0, trigger: 0 },
    componentIds: [],
    globalComponentIds: [],
    globalComponents: {},
    systems: {},
    hooks: {},
    triggers: {},
    moduleIdMap: {},
    dependencies: [],
    imported: []
  }
};

export const ECS = (name?: string): ECS => {
    return {
        ...Module(name),
        entities: {},
        componentGroups: {},
        componentGroupMemberships: {},
        components: {},
        componentTriggers: {},
    };
};

