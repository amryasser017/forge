import { Diagram } from './diagram.mjs';
import { toPng } from './render.mjs';
const D = new Diagram(1700, 1010, 'Component Diagram 3 of 3: Weekly Plan, Attendance & Goals, Body Tracking and InBody Reports');
const dot = (x, y) => D.add(`<circle cx="${x}" cy="${y}" r="3.2" fill="#1B5E8C"/>`);

D.comp('C12', 'C12 App Shell and Composition Views (Home, Plan page, Body, InBody, Charts, Settings)', 250, 55, 1200, 70, { sub: ['requires: IPlan, IAttendance, IBodyTracker, IBodyReader, IInBody, IInBodyReader'] });

// providers on the left
D.comp('C4', 'C4 Workout Logging', 20, 145, 150, 70, { sub: ['provides: ILogReader'] });
D.comp('C3', 'C3 Exercise Library', 20, 262, 150, 80, { sub: ['provides:', 'IExerciseCatalog,', 'IExerciseSearch'] });
D.comp('C5', 'C5 Progress', 20, 362, 150, 80, { sub: ['provides: IProgress'] });

D.sub('FEAT', 'Features', 250, 190, 1200, 400);
D.comp('C6', 'C6 Weekly Plan', 300, 262, 240, 150, { sub: ['provides: IPlan', 'requires: IExerciseCatalog,', 'IExerciseSearch, IProgress,', 'IDataStore, IProfile'] });
D.comp('C7', 'C7 Attendance & Goals', 590, 262, 240, 150, { sub: ['provides: IAttendance', 'requires: IPlan, ILogReader,', 'IProfile, IDataStore, IDates'] });
D.comp('C8', 'C8 Body Tracking', 880, 262, 240, 150, { sub: ['provides: IBodyTracker,', 'IBodyReader', 'requires: IDataStore, IProfile,', 'IUnits'] });
D.comp('C9', 'C9 InBody Reports', 1170, 262, 240, 150, { sub: ['provides: IInBody,', 'IInBodyReader', 'requires: IDataStore, IUnits'] });

// ports on the bottom boundary
D.port('pProf', 300, 590); D.port('pUn', 1100, 590); D.port('pData', 1400, 590);
D.comp('C1', 'C1 Identity & Profile', 215, 660, 190, 70, { sub: ['provides: IProfile'] });
D.comp('C10', 'C10 Units & Dates', 1005, 660, 190, 70, { sub: ['provides: IUnits, IDates'] });
D.comp('C2', 'C2 Data Store', 1305, 660, 190, 70, { sub: ['provides: IDataStore'] });

// left providers -> C6
D.assembly([[170, 285], [300, 285]], 'IExerciseCatalog', { lx: 235, ly: 268 });
D.assembly([[170, 325], [300, 325]], 'IExerciseSearch', { lx: 235, ly: 343 });
D.assembly([[170, 395], [300, 395]], 'IProgress', { lx: 235, ly: 378 });
// C4 -> C7 over the top
D.assembly([[170, 205], [640, 205], [640, 262]], 'ILogReader', { pos: 0.3, lx: 330, ly: 195 });
// inside the subsystem
D.assembly([[540, 300], [590, 300]], 'IPlan', { lx: 565, ly: 283 });
// provided interfaces to the shell
D.assembly([[420, 262], [420, 125]], 'IPlan');
D.assembly([[760, 262], [760, 125]], 'IAttendance', { lx: 752, ly: 209, anchor: 'end' });
D.assembly([[930, 262], [930, 125]], 'IBodyTracker', { lx: 922, ly: 209, anchor: 'end' });
D.assembly([[1030, 262], [1030, 125]], 'IBodyReader');
D.assembly([[1220, 262], [1220, 125]], 'IInBody', { lx: 1212, ly: 209, anchor: 'end' });
D.assembly([[1340, 262], [1340, 125]], 'IInBodyReader');

// required buses (delegation from the ports), then provider -> port assemblies
const rail = (pts) => D.poly(pts);
// IDataStore rail y=450
rail([[330, 450], [1400, 450]]); rail([[1400, 590], [1400, 450]]);
[330, 620, 910, 1200].forEach((x) => { rail([[x, 450], [x, 412]]); dot(x, 450); });
dot(1400, 450);
// IProfile rail y=490
rail([[300, 590], [300, 490]]); rail([[300, 490], [960, 490]]);
[360, 650, 940].forEach((x) => { rail([[x, 490], [x, 412]]); dot(x, 490); });
dot(300, 490);
// IUnits rail y=530
rail([[1100, 590], [1100, 530]]); rail([[920, 530], [1240, 530]]);
[930, 1230].forEach((x) => { rail([[x, 530], [x, 412]]); dot(x, 530); });
dot(1100, 530);
D.assembly([[300, 660], [300, 597]], 'IProfile', { lx: 316, ly: 628 });
D.assembly([[1100, 660], [1100, 597]], 'IUnits', { lx: 1116, ly: 628 });
D.assembly([[1400, 660], [1400, 597]], 'IDataStore', { lx: 1416, ly: 628 });
D.text(1010, 478, 'required: IProfile (C6, C7, C8)', { size: 10.5, italic: true });
D.text(1255, 470, 'required: IDataStore (C6 to C9)', { size: 10.5, italic: true });
D.text(1255, 548, 'required: IUnits (C8, C9)', { size: 10.5, italic: true });

D.note(30, 770, 400, 'IPlan (C6)', ['usePlan() -> { plan, loading, unplacedDays }', 'usePlanActions(): apply, update, addExercise, applyTemplate', 'shiftWeek  swapDays  moveDay  copyDay  clearDay', 'addItem  removeItem  moveItem  setTargets  toggleFocus', 'planGoal  planHasItems  migrateSchedule  TEMPLATES']);
D.note(450, 770, 400, 'IAttendance (C7)', ['useCol("checkins")   put("checkins", date, {date})', 'del("checkins", date)   weekStart(date)', 'weekStreak(dates, goal)', 'goal = planGoal(plan) or profile.weeklyGoal (default 3)']);
D.note(870, 770, 400, 'IBodyTracker + IBodyReader (C8)', ['add("weights", {value, date})   del("weights", id)', 'saveProfile({startWeight, targetWeight, targetDate})', 'progressPct(start, current, target)', 'useCol("weights")']);
D.note(1290, 770, 380, 'IInBody + IInBodyReader (C9)', ['add("inbody", {date, metrics, note, image})', 'del("inbody", id)   useCol("inbody")', 'compressImage(file, 1200, 0.74)   IN_METRICS', 'compare two reports, metric by metric']);
D.text(30, 990, 'Ball = provided interface, socket = required interface. Squares on the Features box are ports; lines from a port inside the box deliver the interface to every component that needs it.', { size: 11.5, italic: true });
await toPng(D, '../cp3_plan_attendance_body.png');
