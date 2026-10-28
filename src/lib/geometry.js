import { fkOn } from './matching.js';

// Fixed sizes keep table rows predictable, so relationship lines can be drawn without measuring the DOM.
export const TW = 300, HEAD = 44, ROW = 36, FKH = 30, ADD = 36;

export const rowH = c => ROW + (fkOn(c) ? FKH : 0);
export const tblH = t => HEAD + t.cols.reduce((a, c) => a + rowH(c), 0) + ADD + 2;
export const colY = (t, i) => t.y + 1 + HEAD + t.cols.slice(0, i).reduce((a, c) => a + rowH(c), 0) + ROW / 2;
