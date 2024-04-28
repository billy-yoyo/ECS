import { Component } from "../ecs/component";
import { ECS, Module } from "../ecs/ecs";
import { addDependancy } from "../ecs/module";
import { System } from "../ecs/system";
import { MovementModule, Position } from "./movement";
import { CanvasModule, GFXContext } from "./canvas";
import { LifetimeModule, OnRender } from "./lifetime";

export const CanvasCirclesModule = Module('CanvasCircles');
addDependancy(CanvasCirclesModule, CanvasModule);
addDependancy(CanvasCirclesModule, LifetimeModule);
addDependancy(CanvasCirclesModule, MovementModule);

export const Radius = Component<number>(CanvasCirclesModule);
export const FillStyle = Component<string>(CanvasCirclesModule);

System(CanvasCirclesModule, OnRender, [Position, Radius, FillStyle, GFXContext],
    (ecs: ECS, entity: number, pos: Position, radius: number, fillStyle: string, ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
        ctx.fill();
    }, 'Render'
);
