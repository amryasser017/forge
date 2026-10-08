import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const mode = () => (existsSync('mode.txt') ? readFileSync('mode.txt', 'utf8').trim() : 'ok');
http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const j = JSON.parse(body || '{}');
    const sys = String(j.system || ''), user = String(j.messages?.[0]?.content || '');
    console.log('AI call:', req.headers['x-api-key'] ? 'key-present' : 'NO-KEY', '|', sys.slice(0, 50).replace(/\n/g, ' '));
    const m = mode();
    if (m === 'down') { res.writeHead(529); return res.end('{"error":"overloaded"}'); }
    let text;
    if (m === 'garbage') text = 'sorry I cannot do JSON {{{';
    else if (sys.includes('convert a food diary')) text = '```json\n{"items":[{"name":"Cooked rice","quantity":200,"unit":"g","grams":200,"calories":260,"proteinG":5.4,"carbsG":56,"fatG":0.6,"confidence":"high","question":null},{"name":"Grilled chicken breast","quantity":150,"unit":"g","grams":150,"calories":248,"proteinG":46,"carbsG":0,"fatG":5.4,"confidence":"medium","question":"Was it cooked with oil?"}]}\n```';
    else if (sys.includes('WEEKLY challenges')) text = '{"suggestions":[{"title":"Four sessions","description":"Train 4 times","metric":"workout_sessions","target":4},{"title":"Lose 10kg fast","description":"unsafe","metric":"weight_loss","target":10},{"title":"Huge","description":"too big","metric":"workout_sessions","target":99}]}';
    else if (sys.includes('meal ideas')) text = '{"ideas":[{"title":"Tuna & rice bowl","ingredients":["tuna","rice","corn"],"approxCalories":520,"approxProteinG":38}]}';
    else if (sys.includes('Rewrite the message')) text = 'POLISHED: ' + user;
    else text = 'AI-NARRATIVE: ' + (user.includes('Question') ? 'answer based on your data.' : 'You trained 2 times in the last 4 weeks (digest).');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
  });
}).listen(54400, () => console.log('mock AI on 54400'));
