import { addGlobalComponent, getGlobalComponent, GlobalComponent } from "../ecs/component";
import { ECS, Module } from "../ecs/ecs";
import { addDependancy } from "../ecs/module";
import { GlobalSystem } from "../ecs/system";
import { LifetimeModule, PreRender } from "./lifetime";

export const CanvasModule = Module('Canvas');
addDependancy(CanvasModule, LifetimeModule);

export const Canvas = GlobalComponent<HTMLCanvasElement>(CanvasModule);
export const GFXContext = GlobalComponent<CanvasRenderingContext2D>(CanvasModule);

export const addCanvas = (ecs: ECS, canvas: HTMLCanvasElement, ctx?: CanvasRenderingContext2D) => {
    addGlobalComponent(ecs, Canvas, canvas);
    addGlobalComponent(ecs, GFXContext, ctx || canvas.getContext('2d'));
};

GlobalSystem(CanvasModule, PreRender, (ecs: ECS) => {
    const ctx = getGlobalComponent(ecs, GFXContext);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}, 'ClearCanvas');
