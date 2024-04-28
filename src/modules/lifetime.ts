import { addGlobalComponent, getGlobalComponent, GlobalComponent } from "../ecs/component";
import { ECS, Module } from "../ecs/ecs";
import { Hook } from "../ecs/hook";
import { Program } from "../ecs/program";
import { GlobalSystem } from "../ecs/system";

export const LifetimeModule = Module('Lifetime');

export const PreUpdate = Hook(LifetimeModule, 'PreUpdate');
export const OnUpdate = Hook(LifetimeModule, 'OnUpdate');
export const PostUpdate = Hook(LifetimeModule, 'PostUpdate');

export const PreRender = Hook(LifetimeModule, 'PreRender');
export const OnRender = Hook(LifetimeModule, 'OnRender');

export const LastTick = GlobalComponent<number>(LifetimeModule);
export const TimeDelta = GlobalComponent<number>(LifetimeModule, 0);

export const UpdateTimeSystem = GlobalSystem(LifetimeModule, PreUpdate, (ecs: ECS) => {
    const time = new Date().getTime() / 1000;
    const lastTime = getGlobalComponent(ecs, LastTick);
    const delta = lastTime === undefined ? 0.001 : time - lastTime;
    addGlobalComponent(ecs, LastTick, time);
    addGlobalComponent(ecs, TimeDelta, Math.min(delta, 0.1));
}, 'UpdateTimeDelta');

export const LifetimeLoop = Program([
    PreUpdate,
    OnUpdate,
    PostUpdate,
    PreRender,
    OnRender
]);
