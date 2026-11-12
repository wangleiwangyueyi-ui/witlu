const rules = [
  ['solemn', /南京大屠杀|旅顺大屠杀|济南惨案|五卅惨案|九一八|七三一|731部队|三光政策|万人坑/],
  ['sorrow', /长平|靖康|风波亭|崖山|土木之变|甲申|扬州十日|嘉定三屠|圆明园|甲午|自沉|冤杀|屈死/],
  ['fire', /赤壁|火攻|火烧连营/],
  ['disaster', /黄河.*(决口|改道|泛滥)|洪水|水灾|地震|大旱|饥荒|蝗灾/],
  ['glory', /统一|一统|贞观|开元盛世|永乐盛世|康乾|文景之治|开皇之治|开边|大一统/],
  ['voyage', /张骞|玄奘|郑和|下西洋|西行|出使西域|丝绸之路|远航/],
  ['poetic', /李白|杜甫|苏轼|王维|兰亭|雪拥蓝关|诗|赋|词作|题咏/],
  ['war', /之战|战役|攻灭|攻破|北伐|南征|起兵|兵变|叛乱|安史之乱|征讨|大战|战败|大破/]
];
export const MOODS = ['sorrow', 'solemn', 'war', 'fire', 'glory', 'voyage', 'poetic', 'disaster', 'none'];
export function classifyMood(event) {
  const text = [event.title, event.zh, event.headline, event.descZh, event.site].filter(Boolean).join(' ');
  // This override always wins, even when the same text also says fire or war.
  if (event.year >= 1840 && /屠杀|惨案|惨祸|大轰炸|集中营|种族灭绝|细菌战|毒气|虐杀|万人坑|暴行|花园口.*决[堤口]/.test(text)) return { mood: 'solemn', rule: 'modern-atrocity-override' };
  for (const [mood, pattern] of rules) if (pattern.test(text)) return { mood, rule: pattern.source };
  return { mood: 'none', rule: 'no-keyword' };
}
