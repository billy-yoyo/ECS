import { Component, GlobalComponent, EntityComponentHandler, GlobalComponentHandler, addGlobalComponent, getGlobalComponent } from "./ecs/component";
import { ECS } from "./ecs/ecs";
import { Entity } from "./ecs/entity";
import { Hook } from "./ecs/hook";
import { Program } from "./ecs/program";
import { System } from "./ecs/system";

const ecs: ECS = ECS();

const OnUpdate = Hook(ecs);

type Position = { x: number, y: number };
const Position = Component<Position>(ecs);

type Velocity = { x: number, y: number };
const Velocity = Component<Velocity>(ecs);

const Static = Component<boolean>(ecs);

const LastTick = GlobalComponent<number>(ecs, new Date().getTime());
const TimeDelta = GlobalComponent<number>(ecs, 0);

const Move = System(ecs, OnUpdate, { with: [Position, Velocity, TimeDelta], without: [Static] }, (ecs: ECS, eid: Entity, pos: Position, vel: Velocity, delta: number) => {
    pos.x += vel.x * delta;
    pos.y += vel.y * delta;
});

const Print = System(ecs, OnUpdate, [Position], (ecs: ECS, eid: Entity, pos: Position) => {
    console.log(JSON.stringify(pos));
});

const entity = EntityComponentHandler(ecs);
entity.add(Position)({ x: 0, y: 0 });
entity.add(Velocity)({ x: 1 / 1000, y: 0 });

const staticEntity = EntityComponentHandler(ecs);
staticEntity.add(Position)({ x: 0, y: 0 });
staticEntity.add(Velocity)({ x: 1 / 1000, y: 0 });
staticEntity.add(Static)(true);

export const Loop = Program([
    (ecs: ECS) => {
        const time = new Date().getTime();
        const delta = time - getGlobalComponent(ecs, LastTick);
        addGlobalComponent(ecs, LastTick, time);
        addGlobalComponent(ecs, TimeDelta, delta);
    },
    OnUpdate,
    () => {
        setTimeout(Loop, 100);
    }
]);

Loop(ecs);
