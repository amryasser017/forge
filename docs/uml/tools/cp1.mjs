import { Diagram } from './diagram.mjs';
import { toPng } from './render.mjs';
const D = new Diagram(1500, 990, 'Component Diagram 1 of 3: Identity, Data Store and Shared Kernel');

D.sub('FB', 'Firebase', 30, 190, 230, 560, 'external system');
D.comp('AUTH', 'Firebase Auth', 50, 265, 190, 80, { sub: ['provides: Auth SDK'] });
D.comp('FS', 'Cloud Firestore', 50, 625, 190, 80, { sub: ['provides: Firestore SDK'] });
D.port('pA', 260, 295); D.port('pF', 260, 665);
D.poly([[240, 295], [260, 295]]); D.poly([[240, 665], [260, 665]]);

D.comp('C12', 'C12 App Shell and Composition Views', 320, 55, 1110, 70, { sub: ['requires: IAuth, IProfile, IUnits, IDates (and every other feature interface, see diagrams 2 and 3)'] });

D.sub('FEAT', 'Features', 300, 190, 640, 270);
D.comp('C1', 'C1 Identity & Profile', 330, 250, 270, 100, { sub: ['provides: IAuth, IProfile', 'requires: IDataStore, Auth SDK', 'npm package @forge/identity'] });
D.comp('C8', 'C8 Body Tracking', 650, 250, 270, 100, { sub: ['provides: IBodyTracker, IBodyReader', 'requires: IDataStore, IProfile, IUnits'] });

D.sub('KER', 'Shared Kernel', 1100, 190, 330, 270);
D.comp('C10', 'C10 Units & Dates', 1130, 250, 270, 100, { sub: ['provides: IUnits, IDates', 'requires: nothing', 'npm package @forge/shared'] });

D.sub('FND', 'Foundation', 300, 540, 640, 210);
D.comp('C2', 'C2 Data Store', 400, 600, 440, 100, { sub: ['provides: IDataStore', 'requires: Firestore SDK, uid (injected by the shell)', 'npm package @forge/datastore (also owns the Firebase app)'] });

// assemblies: provider -> consumer
D.assembly([[260, 295], [330, 300]], 'Auth SDK', { ly: 278 });
D.assembly([[260, 665], [400, 660]], 'Firestore SDK', { ly: 643 });
D.assembly([[450, 600], [450, 350]], 'IDataStore', { pos: 0.45 });
D.assembly([[780, 600], [780, 350]], 'IDataStore', { pos: 0.45 });
D.assembly([[600, 300], [650, 300]], 'IProfile', { ly: 283, lx: 625 });
D.assembly([[1130, 300], [920, 300]], 'IUnits', { ly: 283 });
D.assembly([[400, 250], [400, 125]], 'IAuth');
D.assembly([[520, 250], [520, 125]], 'IProfile');
D.assembly([[1170, 250], [1170, 125]], 'IUnits');
D.assembly([[1290, 250], [1290, 125]], 'IDates');

// operation lists
let y = 790;
D.note(30, y, 340, 'IAuth + IProfile (C1)', ['user (undefined = loading, null = signed out)', 'signUp(name, email, password)', 'signIn(email, password)', 'signInWithGoogle()', 'signOut()', 'profile, saveProfile(partial), ensureProfile()']);
D.note(390, y, 340, 'IDataStore (C2)', ['useCol(name) -> { items, loading }', 'add(name, data)   put(name, id, data)', 'merge(name, id, data)', 'ensureDoc(name, id, data)  (never overwrites)', 'upd(name, id, data)   del(name, id)']);
D.note(750, y, 340, 'IUnits + IDates (C10)', ['show(kg)   toKg(value)   r1(n)', 'ymd(date)   todayStr()', 'fmtDate(s)   shortDate(s)', 'weekStart(s)  (Saturday)   byDate(a, b)', 'DAY_NAMES   WEEK_ORDER']);
D.note(1110, y, 340, 'IBodyTracker + IBodyReader (C8)', ['addWeighIn(value, date)   deleteWeighIn(id)', 'saveGoal(start, target, date)', 'progressPct(start, current, target)', 'useCol("weights")']);
D.text(30, 960, 'Ball = provided interface, socket = required interface. Lines inside a box show what the component provides and requires.', { size: 11.5, italic: true });
await toPng(D, '../cp1_identity_data.png');
