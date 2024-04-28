import { addComponent, Component, getComponent } from "../ecs/component";
import { ECS, Module } from "../ecs/ecs";
import { Entity } from "../ecs/entity";
import { Trigger } from "../ecs/trigger";

export const CellHashModule = Module('CellHash');

export interface Cell {
    x: number;
    y: number;
}
export const Cell = Component<Cell>(CellHashModule);
export const ParentCellHash = Component<number>(CellHashModule);

export type CellHash = {[x: number]: {[y: number]: number[]}};
export const CellHash = Component<CellHash>(CellHashModule);

Trigger(CellHashModule, Cell, (ecs: ECS, entity: Entity, oldCell: Cell, newCell: Cell) => {
    const cellHashEntity = getComponent(ecs, entity, ParentCellHash);
    if (cellHashEntity !== undefined) {
        const cellHash = getComponent(ecs, cellHashEntity, CellHash);
        if (oldCell === undefined && newCell === undefined) {
            return;
        } else if (oldCell === undefined && newCell !== undefined) {
            get(cellHash, newCell).push(entity);
        } else if (oldCell !== undefined && newCell === undefined) {
            remove(get(cellHash, oldCell), entity);
        } else if (oldCell.x !== newCell.x || oldCell.y !== newCell.y) {
            remove(get(cellHash, oldCell), entity);
            get(cellHash, newCell).push(entity);
        }
    }
}, 'CellHash');

const get = (cellHash: CellHash, cell: Cell): number[] => {
    if (!cellHash[cell.x]) {
        cellHash[cell.x] = {};
    }
    let entities = cellHash[cell.x][cell.y];
    if (!entities) {
        entities = [];
        cellHash[cell.x][cell.y] = entities;
    }
    return entities;
}

const remove = (arr: any[], val: any) => {
    const index = arr.indexOf(val);
    if (index >= 0) {
        arr.splice(index, 1);
    }
};

export const addCellHash = (ecs: ECS) => {
    const cellHashEntity = Entity(ecs);
    addComponent(ecs, cellHashEntity, CellHash, {});
    return cellHashEntity;
};

export const addToCellHash = (ecs: ECS, cellHashEntity: Entity, entity: Entity, cell?: Cell) => {
    addComponent(ecs, entity, ParentCellHash, cellHashEntity);
    addComponent(ecs, entity, Cell, cell || { x: 0, y: 0 });
};

export const removeFromCellHash = (ecs: ECS, cellHashEntity: Entity, entity: Entity) => {
    const cellHash = getComponent(ecs, cellHashEntity, CellHash);
    Object.values(cellHash).forEach(col => Object.values(col).forEach(ents => remove(ents, entity)));
};

export const getEntitiesInCell = (ecs: ECS, cellHashEntity: Entity, cell: Cell) => {
    const cellHash = getComponent(ecs, cellHashEntity, CellHash);
    return get(cellHash, cell);
};

export const forEachEntityInRange = (ecs: ECS, cellHashEntity: Entity, from: Cell, to: Cell, iter: (entity: Entity) => void) => {
    for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x++) {
        for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y++) {
            getEntitiesInCell(ecs, cellHashEntity, { x, y }).forEach(iter);
        }
    }
};
