import { TimeDock, TimeEffectControls } from '../components/TimeDock';
import { TimeDriver } from '../components/TimeDriver';
import { ChapterContent } from '../components/Chapter';
import { yearToIndex } from '@witlu/core/time';
import { seekYear, setTimeView } from '../store/time';
export default function TimelineLab() {
    return <main className="timeline-lab"><TimeDriver /><h1>历史长河实验室</h1><a href="/lab/time-flight">穿越云层实验 →</a><p>左右键逐年，Shift 十年；空格播放；拖动及双指缩放。</p><div className="lab-presets">{([['三国', 200, 290, 230], ['南北朝', 420, 610, 500], ['五代十国', 890, 990, 930], ['宋辽金夏', 960, 1280, 1127]] as const).map(([title, a, b, year]) => <button key={title} onClick={() => { seekYear(year); setTimeView(yearToIndex(a), yearToIndex(b)); }}>{title}</button>)}</div><TimeDock /><TimeEffectControls /><ChapterContent /></main>;
}
