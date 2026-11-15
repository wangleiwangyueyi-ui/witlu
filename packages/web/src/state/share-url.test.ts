import {expect,it} from 'vitest';
import {shareURL} from './share-url';
it('builds public QR links without debug or embedding',()=>{expect(shareURL('?year=100&debug=1&embed=1',230)).toBe('https://witlu.com/?year=230');});
it('keeps route years and selected station',()=>{const u=new URL(shareURL('?year=1079,1080,1094&place=湖州,黄州,惠州&stop=2',1094));expect(u.searchParams.get('year')).toBe('1079,1080,1094');expect(u.searchParams.get('stop')).toBe('2');});
