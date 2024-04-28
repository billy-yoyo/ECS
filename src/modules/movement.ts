import { Component, getComponent, updatedComponent } from "../ecs/component";
import { ECS, Module } from "../ecs/ecs";
import { Entity } from "../ecs/entity";
import { addDependancy } from "../ecs/module";
import { System } from "../ecs/system";
import { LifetimeModule, OnUpdate, PreUpdate, TimeDelta, UpdateTimeSystem } from "./lifetime";

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

