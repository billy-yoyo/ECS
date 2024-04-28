
# ECS

This is a custom build entity component system in Typescript. The ECS is found within `/src/ecs`, and some useful modules can be found within `/src/modules`.

The gas example can be found in `/src/gasExample.ts` which makes use of most of the features of the ECS.

## How it works?

An Entity component system is essentially just a way of organizing entities, by grouping data columns together instead of entities together.

An "Entity" is just an ID. You add data to an entity by adding the entity to a component dataset. So essentially instead of a data model like this:

    {
      entity_1 => {
        column_a => value,
        column_b => value,
        ...
      },
      entity_2 => ...
    }

We instead have a data model like

    {
      column_a => {
        entity_1 => value,
        entity_2 => value,
        ...
      },
      ...
    }

This enables us to define "systems" which just operate on sets of components, which makes "type composition" a natural consequence of this.

## API

Take a look around at the modules and the `gasExample` to see some examples of the API. The `movement` module is a good representative example:

    export const MovementModule = Module('Movement');
    addDependancy(MovementModule, LifetimeModule);

    export type Position = { x: number, y: number };
    export const Position = Component<Position>(MovementModule);

    export type Velocity = { x: number, y: number };
    export const Velocity = Component<Velocity>(MovementModule);

    export type Acceleration = { x: number, y: number };
    export const Acceleration = Component<Acceleration>(MovementModule);

    export const Static = Component<boolean>(MovementModule);

    System(MovementModule, PreUpdate, { with: [Velocity, Acceleration, TimeDelta], after: [UpdateTimeSystem] },
        (ecs: ECS, entity: Entity, vel: Velocity, acc: Acceleration, delta: number) => {
            vel.x += acc.x * delta / 2;
            vel.y += acc.y * delta / 2;
            updatedComponent(ecs, entity, Velocity);
        }, 'KickAcceleration'
    );

    export const MovementSystem = System(MovementModule, OnUpdate, { with: [Position, Velocity, TimeDelta], without: [Static] }, 
        (ecs: ECS, entity: Entity, pos: Position, vel: Velocity, delta: number) => {
            const acc = getComponent(ecs, entity, Acceleration);

            pos.x += vel.x * delta;
            pos.y += vel.y * delta;
            updatedComponent(ecs, entity, Position);

            if (acc) {
                vel.x += acc.x * delta / 2;
                vel.y += acc.y * delta / 2;
                updatedComponent(ecs, entity, Velocity);
            }
        }, 'Movement'
    );

Here we can see how our systems query components to work on, and then provide an executor which does some work per-entity. 