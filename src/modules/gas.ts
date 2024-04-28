import { addComponent, Component, getComponent, getGlobalComponent, GlobalComponent } from "../ecs/component";
import { ECS, Module } from "../ecs/ecs";
import { Entity } from "../ecs/entity";
import { addDependancy } from "../ecs/module";
import { System } from "../ecs/system";
import { OnUpdate } from "./lifetime";
import { Acceleration, MovementModule, Position, Velocity } from "./movement";
import { Cell, CellHashModule, forEachEntityInRange, ParentCellHash } from "./cellhash";
import { LifetimeModule, OnRender, TimeDelta } from "./lifetime";
import { MovementSystem } from "./movement";
import { Bounds } from "./bounds";

export const GasModule = Module('Gas');
addDependancy(GasModule, LifetimeModule);
addDependancy(GasModule, MovementModule);
addDependancy(GasModule, CellHashModule);

export const IsGas = Component<boolean>(GasModule);
export const MoleculeMass = Component<number>(GasModule);
export const MoleculePressureDensityCoef = Component<number>(GasModule);

export type GasConfig = {
    stateConstant: number;
    polytropicIndex: number;
    viscosity: number;
    gravity: Acceleration;
    smoothingLength: number;
    simulationScale: number;
};
export const GasConfig = GlobalComponent<GasConfig>(GasModule);

const alpha = 7 / (4 * Math.PI);

const smooth = (x: number, gas: GasConfig) => {
    x /= gas.simulationScale;
    if (x >= 2 * gas.smoothingLength) {
        return 0;
    } else {
        const h = gas.smoothingLength;
        //return (1 / ((gas.smoothingRadius ** 3) * Math.pow(Math.PI, 3 / 2))) * Math.pow(Math.E, -(x * x) / (gas.smoothingRadius * gas.smoothingRadius));
        const ratio = x / h;
        return (alpha / h) * ((1 - (0.5 * ratio)) ** 4) * (1 + (2 * ratio));
    }
};

const smoothDeriv = (v: { x: number, y: number }, x: number, gas: GasConfig) => {
    x /= gas.simulationScale;
    if (x >= 2 * gas.smoothingLength || x <= 0.0001) {
        return { x: 0, y: 0 };
    } else {
        const h = gas.smoothingLength;
        const coef = (5 * alpha * x * (((2 * h) - x) ** 3)) / (8 * (h ** 7));
        return { x: v.x * coef / (x * gas.simulationScale), y: v.y * coef / (x * gas.simulationScale) };
    }
};

const calculatePressure = (density: number, stateConstant: number, polytropicIndex: number) => {
    return stateConstant * Math.pow(density, 1 + (1 / polytropicIndex));
}


const UpdatePressureSystem = System(GasModule, OnUpdate, { with: [Position, Cell, ParentCellHash, IsGas, GasConfig], before: [MovementSystem] }, 
    (ecs: ECS, entity: Entity, pos: Position, cell: Cell, cellHashEntity: number, isGas: boolean, gas: GasConfig) => {
        if (isGas) {
            let density = 0;
            let n = 0;
            forEachEntityInRange(ecs, cellHashEntity, { x: cell.x - 1, y: cell.y - 1 }, { x: cell.x + 1, y: cell.y + 1 }, (neighbour) => {
                const npos = getComponent(ecs, neighbour, Position);

                const dx = pos.x - npos.x;
                const dy = pos.y - npos.y;
                const dist =  Math.sqrt((dx * dx) + (dy * dy));

                const mass = getComponent(ecs, neighbour, MoleculeMass) || 1;

                density += mass * smooth(dist, gas);
                n++;
            });
            const pressure = calculatePressure(density, gas.stateConstant, gas.polytropicIndex);
            const pdcoef = pressure / (density * density);


            addComponent(ecs, entity, MoleculePressureDensityCoef, pdcoef);
        }
    }, 'UpdatePressure'
);

System(GasModule, OnUpdate, 
    { 
        with: [Position, Velocity, MoleculePressureDensityCoef, Cell, ParentCellHash, IsGas, GasConfig],
        after: [UpdatePressureSystem], 
        before: [MovementSystem] 
    },
    (ecs: ECS, entity: Entity, pos: Position, vel: Velocity, pdcoef: number, cell: Cell, cellHashEntity: number, isGas: boolean, gas: GasConfig) => {
        if (isGas) {
            const force = { x: 0, y: 0 };
            forEachEntityInRange(ecs, cellHashEntity, { x: cell.x - 1, y: cell.y - 1 }, { x: cell.x + 1, y: cell.y + 1 }, (neighbour) => {
                if (neighbour === entity) {
                    return;
                }

                const npdcoef = getComponent(ecs, neighbour, MoleculePressureDensityCoef);
                const npos = getComponent(ecs, neighbour, Position);

                const mass = getComponent(ecs, neighbour, MoleculeMass) || 1;

                const dx = pos.x - npos.x;
                const dy = pos.y - npos.y;
                const dist =  Math.sqrt((dx * dx) + (dy * dy))

                const sv = smoothDeriv({ x: dx, y: dy }, dist, gas);
                force.x += mass * (pdcoef + npdcoef) * sv.x;
                force.y += mass * (pdcoef + npdcoef) * sv.y;
            });

            const acc: Acceleration = {
                x: force.x - (vel.x * gas.viscosity),
                y: force.y - (vel.y * gas.viscosity)
            };
            const bounds = getGlobalComponent(ecs, Bounds);
            if (bounds) {
                acc.x += (((bounds.left + bounds.right) / 2) - pos.x);
                acc.y += (((bounds.top + bounds.bottom) / 2) - pos.y);
                acc.x += gas.gravity.x;
                acc.y += gas.gravity.y;
            }
            addComponent(ecs, entity, Acceleration, acc);
        }
    }    
)
