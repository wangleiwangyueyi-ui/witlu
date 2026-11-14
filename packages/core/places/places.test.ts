import {describe,it,expect} from 'vitest';
import {activeAt,contains,layoutLabels} from './index';
describe('historical map spatial contracts',()=>{
 it('respects exclusive end years',()=>{expect(activeAt({appear:1194,vanish:1855},1194)).toBe(true);expect(activeAt({appear:1194,vanish:1855},1855)).toBe(false);});
 it('preserves holes and disjoint polygons',()=>{const g={type:'MultiPolygon',coordinates:[[[[0,0],[4,0],[4,4],[0,4],[0,0]],[[1,1],[3,1],[3,3],[1,3],[1,1]]],[[[8,0],[9,0],[9,1],[8,1],[8,0]]]]} as Parameters<typeof contains>[0];expect(contains(g,[.5,.5])).toBe(true);expect(contains(g,[2,2])).toBe(false);expect(contains(g,[8.5,.5])).toBe(true);});
 it('keeps priority labels and rejects collisions and clipped points',()=>{const m=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];const r=layoutLabels([{id:'town',position:[0,0,0],priority:1,width:80},{id:'capital',position:[0,0,0],priority:10,width:80},{id:'outside',position:[2,0,0],priority:0,width:80}],m,1000,800,20);expect(r.find(p=>p.id==='capital')?.visible).toBe(true);expect(r.filter(p=>p.visible)).toHaveLength(1);});
});
