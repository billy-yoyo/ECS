import { ECS } from "./ecs";
import { Hook, triggerHook } from "./hook";

type Step = Hook | ((ecs: ECS) => void);

export const Program = (steps: Step[]) => {
    let compiled = steps.map(step => typeof step === 'function' ? step : (ecs: ECS) => triggerHook(ecs, step));

    return (ecs: ECS) => {
        compiled.forEach(step => step(ecs));
    }
};
