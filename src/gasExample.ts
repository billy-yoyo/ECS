import { addComponent, addGlobalComponent, removeComponent } from "./ecs/component";
import { ECS } from "./ecs/ecs";
import { Entity, deleteEntity } from "./ecs/entity";
import { importModule } from "./ecs/module";
import { Bounds, BoundsBounceCoef, BoundsHitbox, BoundsModule } from "./modules/bounds";
import { addCanvas, CanvasModule } from "./modules/canvas";
import { CanvasCirclesModule, FillStyle, Radius } from "./modules/canvasCircles";
import { addCellHash, addToCellHash, CellHashModule, removeFromCellHash } from "./modules/cellhash";
import { CellHashDimensions, CellHashMovementModule } from "./modules/cellhashMovement";
import { GasModule, MoleculeMass, GasConfig, IsGas } from "./modules/gas";
import { LifetimeLoop, LifetimeModule } from "./modules/lifetime";
import { Acceleration, Static } from "./modules/movement";
import { MovementModule, Position, Velocity } from "./modules/movement";

const ecs = ECS('MainECS');
importModule(ecs, LifetimeModule);
importModule(ecs, MovementModule);
importModule(ecs, CellHashModule);
importModule(ecs, CellHashMovementModule);
importModule(ecs, CanvasModule);
importModule(ecs, CanvasCirclesModule);
importModule(ecs, GasModule);
importModule(ecs, BoundsModule);

const simulationScale = 20;
const smoothingLength = 1;

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const viscosityEl = document.getElementById('viscosity') as HTMLInputElement;
const polytropicIndexEl = document.getElementById('polytropicIndex') as HTMLInputElement;
const stateConstantEl = document.getElementById('stateConstant') as HTMLInputElement;
const gravityXEl = document.getElementById('gravity-x') as HTMLInputElement;
const gravityYEl = document.getElementById('gravity-y') as HTMLInputElement;


const valueEls = [viscosityEl, polytropicIndexEl, stateConstantEl, gravityXEl, gravityYEl];

addCanvas(ecs, canvas);

const cellHash = addCellHash(ecs);
addComponent(ecs, cellHash, CellHashDimensions, { width: 2 * smoothingLength * simulationScale, height: 2 * smoothingLength * simulationScale });

const getConfig = (): GasConfig => {
    return {
        viscosity: parseInt(viscosityEl.value),
        polytropicIndex: parseInt(polytropicIndexEl.value),
        stateConstant: parseInt(stateConstantEl.value),
        gravity: { x: parseInt(gravityXEl.value), y: parseInt(gravityYEl.value) },
        smoothingLength: smoothingLength,
        simulationScale: simulationScale,
    }
};

const updateConfig = () => {
    console.log('updating config!');
    addGlobalComponent(ecs, GasConfig, getConfig())

};

updateConfig();
valueEls.forEach(el => el.addEventListener('change', () => updateConfig()));


addGlobalComponent(ecs, Bounds, { left: 0, right: canvas.width, bottom: 0, top: canvas.height });
addGlobalComponent(ecs, BoundsBounceCoef, 0.3);

const molecules: Entity[] = [];

const createMolecule = (pos: Position) => {
    const molecule = Entity(ecs);
    molecules.push(molecule);
    /*const opts = Math.random() < 0.5 ? {
        radius: 10,
        mass: 1,
        color: 'rgba(255, 50, 50, 0.8)'
    } : {
        radius: 15,
        mass: 2,
        color: 'rgba(50, 50, 255, 0.8)'
    }*/
    const opts = {
        radius: 10,
        mass: 1,
        color: 'rgba(50, 50, 255, 0.8)'
    }

    // cell
    addToCellHash(ecs, cellHash, molecule);
    // movement components
    addComponent(ecs, molecule, Position, pos);
    addComponent(ecs, molecule, Velocity, { x: 0, y: 0 });
    addComponent(ecs, molecule, Acceleration, { x: 0, y: 0 });
    addComponent(ecs, molecule, BoundsHitbox, { left: -opts.radius, right: opts.radius, bottom: -opts.radius, top: opts.radius });
    // gas components
    addComponent(ecs, molecule, IsGas, true);
    addComponent(ecs, molecule, MoleculeMass, opts.mass);
    // render components
    addComponent(ecs, molecule, Radius, opts.radius);

    const clr = () => Math.floor(Math.random() * 255);
    addComponent(ecs, molecule, FillStyle, opts.color);
};

const createWallMolecule = (pos: Position) => {
    const molecule = Entity(ecs);
    addToCellHash(ecs, cellHash, molecule);
    addComponent(ecs, molecule, Position, pos);
    addComponent(ecs, molecule, IsGas, true);
    addComponent(ecs, molecule, MoleculeMass, 5);
    addComponent(ecs, molecule, Static, true);
}

for (let x = 0; x < canvas.width; x+=5) {
    createWallMolecule({ x, y: 0 });
    createWallMolecule({ x, y: canvas.height });
}

for (let y = 0; y < canvas.height; y+=5) {
    createWallMolecule({ x: 0, y });
    createWallMolecule({ x: canvas.width, y });
}

const generate = () => {
    let totalX = 25;
    let totalY = 25;
    let spacing = 20;
    let offset = { x: (canvas.width / 2) - (totalX * spacing * 0.5), y: (canvas.height / 2) - (totalY * spacing * 0.5)};

    for (let x = 0; x < totalX; x++) {
        for (let y = 0; y < totalY; y++) {
            createMolecule({ x: offset.x + (spacing * x), y: offset.y + (spacing * y) });
        }
    }
};

generate();

document.getElementById("reset-button").addEventListener('click', () => {
    for (let molecule of molecules) {
        removeFromCellHash(ecs, cellHash, molecule)
        deleteEntity(ecs, molecule);
    }
    molecules.splice(0, molecules.length);
    generate();
});

setInterval(() => LifetimeLoop(ecs), 10);
//LifetimeLoop(ecs);
