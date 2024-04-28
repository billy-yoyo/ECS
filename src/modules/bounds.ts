import { Component, getGlobalComponent, GlobalComponent } from "../ecs/component";
import { ECS, Module } from "../ecs/ecs";
import { addDependancy } from "../ecs/module";
import { System } from "../ecs/system";
import { OnUpdate } from "./lifetime";
import { MovementModule, Position, Velocity } from "./movement";
import { MovementSystem } from "./movement";

export const BoundsModule = Module('Bounds');
addDependancy(BoundsModule, MovementModule);

// top and bottom refer to the highest and lowest numerical points on the rect, not on the screen
export type Rect = { left: 0, right: 0, top: 0, bottom: 0 };

export const Bounds = GlobalComponent<Rect>(BoundsModule);
export const BoundsBounceCoef = GlobalComponent<number>(BoundsModule);
export const BoundsHitbox = Component<Rect>(BoundsModule);

System(BoundsModule, OnUpdate, { with: [Position, Velocity, Bounds, BoundsHitbox], after: [MovementSystem] }, 
    (ecs: ECS, entity: number, pos: Position, vel: Velocity, bounds: Rect, hitbox: Rect) => {
        const bounce = getGlobalComponent(ecs, BoundsBounceCoef) || 1;
        
        // out-of-bounds on the left
        if (pos.x + hitbox.left < bounds.left) {
            pos.x = bounds.left - hitbox.left;
            vel.x *= -bounce;
        // out-of-bounds on the right
        } else if (pos.x + hitbox.right > bounds.right) {
            pos.x = bounds.right - hitbox.right;
            vel.x *= -bounce;
        }

        // out-of-bounds on the bottom
        if (pos.y + hitbox.bottom < bounds.bottom) {
            pos.y = bounds.bottom - hitbox.bottom;
            vel.y *= -bounce;
        // out-of-bounds on the top
        } else if (pos.y + hitbox.top > bounds.top) {
            pos.y = bounds.top - hitbox.top;
            vel.y *= -bounce;
        }
    }, 'CheckBounds'
);
