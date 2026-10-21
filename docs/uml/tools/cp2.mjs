import { Diagram } from './diagram.mjs';
import { toPng } from './render.mjs';
const D = new Diagram(1500, 1130, 'Component Diagram 2 of 3: Exercise Library, Workout Logging and Progress & Analytics');

D.comp('C12', 'C12 App Shell and Composition Views (Lifts, Exercise detail, Exercise sheet, Home, Charts)', 60, 55, 1380, 70, { sub: ['requires: IExerciseCatalog, IExerciseSearch, ILogger, ILogReader, IProgress, IPlan'] });

D.sub('FEAT', 'Features', 30, 190, 1230, 460);
D.comp('C4', 'C4 Workout Logging', 60, 250, 300, 110, { sub: ['provides: ILogger, ILogReader', 'requires: IDataStore, IExerciseCatalog,', 'IProgress, IUnits, IDates'] });
D.comp('C3', 'C3 Exercise Library', 480, 250, 300, 110, { sub: ['provides: IExerciseCatalog, IExerciseSearch', 'requires: IDataStore, IDates,', 'Image CDN, YouTube (links only)'] });
D.comp('C6', 'C6 Weekly Plan', 900, 250, 330, 110, { sub: ['provides: IPlan  (see diagram 3)', 'requires: IDataStore, IExerciseCatalog,', 'IExerciseSearch, IProgress'] });
D.comp('C5', 'C5 Progress & Analytics', 480, 450, 300, 110, { sub: ['provides: IProgress', 'requires: IUnits, IDates', '(pure functions: logs are passed in)'] });

D.sub('FND', 'Foundation', 30, 740, 1230, 190);
D.comp('C2', 'C2 Data Store', 250, 800, 700, 100, { sub: ['provides: IDataStore', 'requires: Firestore SDK, uid'] });

// provider -> consumer
D.assembly([[480, 290], [360, 290]], 'IExerciseCatalog', { lx: 420, ly: 272 });
D.assembly([[780, 275], [900, 275]], 'IExerciseCatalog', { lx: 840, ly: 258 });
D.assembly([[780, 330], [900, 330]], 'IExerciseSearch', { lx: 840, ly: 348 });
D.assembly([[480, 505], [210, 505], [210, 360]], 'IProgress', { pos: 0.3, lx: 345, ly: 488 });
D.assembly([[780, 505], [1050, 505], [1050, 360]], 'IProgress', { pos: 0.3, lx: 915, ly: 488 });
D.assembly([[780, 545], [1380, 545], [1380, 125]], 'IProgress', { pos: 0.25, lx: 1030, ly: 562 });
D.assembly([[560, 250], [560, 125]], 'IExerciseCatalog');
D.assembly([[700, 250], [700, 125]], 'IExerciseSearch');
D.assembly([[150, 250], [150, 125]], 'ILogger');
D.assembly([[290, 250], [290, 125]], 'ILogReader');
D.assembly([[1000, 250], [1000, 125]], 'IPlan');
D.assembly([[330, 800], [330, 360]], 'IDataStore', { pos: 0.35, lx: 348, ly: 640 });
D.assembly([[440, 800], [440, 415], [520, 415], [520, 360]], 'IDataStore', { pos: 0.4, lx: 456, ly: 600 });
D.assembly([[950, 850], [1150, 850], [1150, 360]], 'IDataStore', { pos: 0.55, lx: 1168, ly: 700 });

D.note(30, 960, 440, 'ILogger + ILogReader (C4)', ['add("logs", {exerciseId, exerciseName, weight kg,','    reps, sets, date})', 'del("logs", id)   getDraft(id)   setDraft(id, values)', 'useCol("logs")   groupLogs(logs)', 'recentExerciseIds(logs, n)   setsOn(logs, date)']);
D.note(490, 960, 380, 'IExerciseCatalog + IExerciseSearch (C3)', ['useExerciseLibrary() -> { data, index, byId }', 'ensureLibExercise(libEx)   docView(doc, byId)', 'imageUrls(ex, i)   libDocId(id)   howToUrl(name)', 'buildIndex   searchIndex(index, query, filters)', 'folderItems(index, folder)   expandQuery(query)']);
D.note(890, 960, 330, 'IProgress (C5)', ['bestWeight(logs)   lastLog(logs)   lastSets(logs, k)', 'sessionsOf(logs)   trendOf(logs)  up | down | flat', 'computePRs(logs)   epley(weight, reps)', 'views: ProgressPanel, Glance, TrendArrow']);
D.note(1240, 960, 210, 'IDataStore (C2)', ['useCol(name)   add   put   merge', 'ensureDoc   upd   del']);
D.text(30, 1115, 'Ball = provided interface, socket = required interface. The arrow of use goes from the socket side (consumer) to the ball side (provider).', { size: 11.5, italic: true });
await toPng(D, '../cp2_library_logging_progress.png');
