import * as api from "./api.ts";
import { mockApi } from "./mock.ts";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

const service = useMock ? mockApi : api;

export const getWaitlist = service.getWaitlist;
export const addParty = service.addParty;
export const updateParty = service.updateParty;
export const deleteParty = service.deleteParty;
export const undoAction = service.undoAction;
export const getTables = service.getTables;
export const createTable = service.createTable;
export const updateTable = service.updateTable;
export const deleteTable = service.deleteTable;
export const getAvgTurnoverTime = service.getAvgTurnoverTime;
export const setAvgTurnoverTime = service.setAvgTurnoverTime;
export const getDailyReport = service.getDailyReport;
export const verifyPin = service.verifyPin;
export const changePin = service.changePin;
export const getWaitlistPaused = service.getWaitlistPaused;
export const setWaitlistPaused = service.setWaitlistPaused;
export const getPartyByToken = service.getPartyByToken;
export const confirmWaiting = service.confirmWaiting;
export const cancelParty = service.cancelParty;
