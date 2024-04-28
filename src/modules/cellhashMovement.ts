import { addComponent, Component, getComponent } from "../ecs/component";
import { ECS, Module } from "../ecs/ecs";
import { Entity } from "../ecs/entity";
import { addDependancy } from "../ecs/module";
import { Trigger } from "../ecs/trigger";
import { Cell, CellHashModule, ParentCellHash } from "./cellhash";
import { MovementModule, Position } from "./movement";


export const CellHashMovementModule = Module('CellHashMovement');
addDependancy(CellHashMovementModule, CellHashModule);
addDependancy(CellHashMovementModule, MovementModule);

export const CellHashDimensions = Component<{ width: number, height: number }>(CellHashMovementModule);

Trigger(CellHashMovementModule, Position, (ecs: ECS, entity: Entity, oldPos: Position, newPos: Position) => {
    const cellHashEntity = getComponent(ecs, entity, ParentCellHash);
    if (cellHashEntity !== undefined) {
        const dimensions = getComponent(ecs, cellHashEntity, CellHashDimensions);
        if (dimensions !== undefined) {
            const newCell: Cell = newPos && { x: Math.floor(newPos.x / dimensions.width), y: Math.floor(newPos.y / dimensions.height) };
            addComponent(ecs, entity, Cell, newCell);
        }
    }
}, 'CellHashMovement');
