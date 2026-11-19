import { TerrainCanvas } from '../components/TerrainCanvas';
import { MorphTimeline } from '../components/MorphTimeline';
import { useChronicle } from '../store/chronicle';

export default function FlatMapLab() {
  const {data} = useChronicle();
  return <main className="flat-map-lab" data-map-mode="flat">
    <TerrainCanvas flat territories environment/>
    <MorphTimeline phases={data?.phases ?? []}/>
  </main>;
}
