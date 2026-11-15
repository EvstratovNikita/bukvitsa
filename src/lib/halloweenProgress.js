import { HALLOWEEN_EVENT as HW } from '../data/events/halloween.js';
import * as ev from './eventProgress.js';

// Прогресс «Ночи тыкв» — прежние имена поверх общего движка ивентов
// (lib/eventProgress.js). Поведение то же, что до движка: его стережёт
// scripts/test-halloween.mjs, который не правили.

export const HW_DEFAULT = ev.defaultState(HW);
export const normalizeHalloween = (raw) => ev.normalize(HW, raw);
export const pumpkinsFor = (attempts) => HW.unitsFor(attempts);
export const earnedToday = ev.earnedToday;
export const nextStep = (hw) => ev.nextStep(HW, hw);
export const nextRiddle = (seen, exclude = null) => ev.nextRiddle(HW, seen, exclude);
export const dueSteps = (hw) => ev.dueSteps(HW, hw);
export const trackDone = (hw) => ev.trackDone(HW, hw);
export const applyHalloweenResult = (raw, args) => ev.applyResult(HW, raw, args);
export const mergeHalloween = (a, b) => ev.merge(HW, a, b);
export const restoreEventItems = ev.restoreEventItems;
