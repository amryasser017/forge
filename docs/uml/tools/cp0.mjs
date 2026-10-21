import { Diagram } from './diagram.mjs';
import { toPng } from './render.mjs';
const D = new Diagram(1700, 1080, 'Forge: Component Diagram (overview of all components and their interfaces)');
const dot = (x, y) => D.add(`<circle cx="${x}" cy="${y}" r="3.2" fill="#1B5E8C"/>`);

D.comp('C11', 'C11 UI Kit', 60, 55, 1070, 62, { sub: ['Sheet, Modal, Stepper, UndoToast, PlateBar, ChartCard, useFocusTrap, theme (provides UI components; requires nothing)'] });

// App shell
D.sub('SHELL', 'App Shell', 40, 170, 300, 700, 'sub system');
D.comp('C12', 'C12 App Shell and\nComposition Views', 70, 230, 240, 580, { sub: ['Routes: / /body /exercises', '  /exercises/:id /schedule', '  /inbody /charts /settings', '', 'Views:', 'Layout and navigation', 'Home (Dashboard, TodayCard)', 'Lifts page', 'Exercise detail', 'Exercise sheet', '  (Progress / How to / Log)', 'Charts', 'Settings', '', 'requires: all feature', 'interfaces below,', 'UI Kit, IUnits, IDates'] });

// features, bottom to top order matches the shell ports
D.sub('FEAT', 'Features', 590, 170, 540, 700, 'sub system');
const rows = [
  ['C3', 'C3 Exercise Library', 'IExerciseCatalog, IExerciseSearch'],
  ['C4', 'C4 Workout Logging', 'ILogger, ILogReader'],
  ['C5', 'C5 Progress & Analytics', 'IProgress'],
  ['C6', 'C6 Weekly Plan', 'IPlan'],
  ['C7', 'C7 Attendance & Goals', 'IAttendance'],
  ['C8', 'C8 Body Tracking', 'IBodyTracker, IBodyReader'],
  ['C9', 'C9 InBody Reports', 'IInBody, IInBodyReader'],
  ['C1', 'C1 Identity & Profile', 'IAuth, IProfile'],
];
const needsData = ['C3', 'C4', 'C6', 'C7', 'C8', 'C9', 'C1'];
const needsUnits = ['C3', 'C4', 'C5', 'C7', 'C8', 'C9'];
const B1 = 950, B2 = 1010;
const ys = {};
rows.forEach(([id, label, prov], i) => {
  const y = 230 + i * 74; ys[id] = y + 31;
  D.comp(id, label, 650, y, 240, 62, { sub: ['provides: ' + prov] });
  D.port('p' + id, 590, y + 31); D.port('s' + id, 340, y + 31);
  D.poly([[590, y + 31], [650, y + 31]]);
  D.poly([[340, y + 31], [310, y + 31]]);
  D.assembly([[590, y + 31], [340, y + 31]], prov, { lx: 465, ly: y + 14 });
});
// buses on the right inside Features
const dy = needsData.map((id) => ys[id]);
D.poly([[B1, Math.min(...dy)], [B1, Math.max(...dy)]]);
needsData.forEach((id) => { D.poly([[890, ys[id]], [B1, ys[id]]]); dot(B1, ys[id]); });
const uy = needsUnits.map((id) => ys[id]);
D.poly([[B2, Math.min(...uy)], [B2, Math.max(...uy)]]);
needsUnits.forEach((id) => { D.poly([[B1, ys[id]], [B2, ys[id]]]); dot(B2, ys[id]); });
D.text(B1 - 8, ys.C1 + 30, 'IDataStore bus', { size: 10.5, italic: true, anchor: 'end' });
D.text(B2 + 8, ys.C9 + 40, 'IUnits, IDates bus', { size: 10.5, italic: true, anchor: 'start' });

// Foundation
D.sub('FND', 'Foundation', 1330, 170, 320, 700, 'sub system');
D.comp('C2', 'C2 Data Store', 1370, 230, 240, 62, { sub: ['provides: IDataStore'] });
D.comp('C10', 'C10 Units & Dates', 1370, 230 + 6 * 74, 240, 62, { sub: ['provides: IUnits, IDates'] });
D.port('fD', 1330, ys.C3); D.port('fU', 1330, ys.C1 - 74 + 0);
// data store port aligned with the first data user row (C3)
D.poly([[1330, ys.C3], [1370, ys.C3]]);
D.poly([[1330, ys.C9], [1370, ys.C9]]);
D.port('hD', 1130, ys.C3); D.port('hU', 1130, ys.C9);
D.poly([[B1, ys.C3], [1130, ys.C3]]);
D.poly([[B2, ys.C9], [1130, ys.C9]]);
D.assembly([[1330, ys.C3], [1130, ys.C3]], 'IDataStore', { lx: 1230, ly: ys.C3 - 16 });
D.assembly([[1330, ys.C9], [1130, ys.C9]], 'IUnits, IDates', { lx: 1230, ly: ys.C9 - 16 });

// ui kit assemblies
D.port('uS', 190, 170); D.port('uF', 860, 170);
D.poly([[190, 170], [190, 230]]);
D.assembly([[190, 117], [190, 163]], 'UI components', { lx: 206, ly: 144 });
D.assembly([[860, 117], [860, 163]], 'UI components', { lx: 876, ly: 144 });

// Firebase
D.sub('FB', 'Firebase', 590, 940, 1060, 110, 'external system');
D.comp('AUTH', 'Firebase Auth', 640, 985, 200, 50, { sub: [] });
D.comp('FS', 'Cloud Firestore', 1450, 985, 190, 50, { sub: [] });
D.port('fbA', 700, 870); D.port('fbF', 1630, 870);
D.poly([[700, 870], [700, ys.C1 + 31]]);
D.poly([[1630, 870], [1630, 261], [1610, 261]]);
D.assembly([[700, 985], [700, 877]], 'Auth SDK', { lx: 716, ly: 968 });
D.assembly([[1630, 985], [1630, 877]], 'Firestore SDK', { lx: 1614, ly: 968, anchor: 'end' });
D.text(30, 1068, 'Ball = provided interface, socket = required interface. Squares are ports on a sub system boundary; lines inside a sub system deliver the interface to the components that need it.', { size: 11.5, italic: true });
await toPng(D, '../cp0_overview.png');
