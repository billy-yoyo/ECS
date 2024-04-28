import { addGlobalComponent, getGlobalComponent, GlobalComponent, updatedComponent } from "../ecs/component";
import { ECS, Module } from "../ecs/ecs";
import { addDependancy } from "../ecs/module";
import { GlobalTrigger } from "../ecs/trigger";
import { Canvas, CanvasModule } from "./canvas";

export const MouseModule = Module();
addDependancy(MouseModule, CanvasModule);

export type Mouse = { x: number, y: number }
export const Mouse = GlobalComponent<Mouse>(MouseModule);

export type MouseButtons = { [button: number]: boolean }
export const MouseButtons = GlobalComponent<MouseButtons>(MouseModule);

export const LastMouseDownEvent = GlobalComponent<MouseEvent>(MouseModule);
export const LastMouseUpEvent = GlobalComponent<MouseEvent>(MouseModule);

GlobalTrigger(MouseModule, Canvas, (ecs: ECS, _: HTMLCanvasElement, newCanvas: HTMLCanvasElement) => {
    newCanvas.addEventListener('mousemove', (e) => {
        const rect = newCanvas.getBoundingClientRect();
        addGlobalComponent(ecs, Mouse, { x: e.clientX - rect.x, y: e.clientY - rect.y });
    });

    newCanvas.addEventListener('mousedown', (e) => {
        const buttons = getGlobalComponent(ecs, MouseButtons);
        buttons[e.button] = true;
        updatedComponent(ecs, undefined, MouseButtons);

        addGlobalComponent(ecs, LastMouseDownEvent, e);
    });

    newCanvas.addEventListener('mouseup', (e) => {
        const buttons = getGlobalComponent(ecs, MouseButtons);
        buttons[e.button] = false;
        updatedComponent(ecs, undefined, MouseButtons);

        addGlobalComponent(ecs, LastMouseUpEvent, e);
    });
});
