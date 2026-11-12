import { PerspectiveCamera, Vector3 } from 'three';
import { BOUNDS, project, unproject } from '../terrain/geo';
import type { InputHandlers, PointerInput } from '../platform/PlatformAdapter';
export interface CameraPose { lon: number; lat: number; distance: number; bearing: number; pitch: number }
const radians = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export class MapCamera implements InputHandlers {
  readonly camera = new PerspectiveCamera(42, 1, 1, 40_000);
  pose: CameraPose;
  width = 1; height = 1; reducedMotion = false;
  private pointers = new Map<number, PointerInput>();
  private velocity = { x: 0, y: 0 }; private targetDistance = 0;
  private flight: { from: CameraPose; to: CameraPose; elapsed: number; duration: number } | null = null;
  private travel = 0; private downPoint: PointerInput | null = null;
  onPick: ((x: number, y: number) => void) | null = null;
  constructor(public mobile = false) { this.pose = this.initial(); this.targetDistance = this.pose.distance; this.sync(); }
  initial(): CameraPose { return { lon: 104, lat: 33, distance: this.mobile ? 6300 : 6800, bearing: 0, pitch: this.mobile ? 40 : 45 }; }
  resize(width: number, height: number) { this.width = width; this.height = height; this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); }
  reset() { this.flyTo(this.initial()); }
  flyTo(pose: Partial<CameraPose>, duration = 1100) { this.cancel(); const to = { ...this.pose, ...pose }; this.constrain(to); if (this.reducedMotion || duration <= 0) { this.pose = to; this.targetDistance = to.distance; this.sync(); } else this.flight = { from: { ...this.pose }, to, elapsed: 0, duration }; }
  constrain(pose = this.pose) { pose.lon = clamp(pose.lon, BOUNDS.west + 1, BOUNDS.east - 1); pose.lat = clamp(pose.lat, BOUNDS.south + 1, BOUNDS.north - 1); pose.distance = clamp(pose.distance, 180, 11000); pose.pitch = clamp(pose.pitch, 25, 65); pose.bearing = ((pose.bearing + 180) % 360 + 360) % 360 - 180; }
  private sync() {
    this.constrain(); const p = project(this.pose.lon, this.pose.lat), phi = this.pose.pitch * radians, theta = this.pose.bearing * radians;
    const horizontal = Math.cos(phi) * this.pose.distance;
    this.camera.position.set(p.x + Math.sin(theta) * horizontal, Math.sin(phi) * this.pose.distance, p.z + Math.cos(theta) * horizontal);
    this.camera.lookAt(new Vector3(p.x, 0, p.z)); this.camera.updateMatrixWorld();
  }
  private pan(dx: number, dy: number) {
    const scale = this.pose.distance * 2 * Math.tan(21 * radians) / this.height, theta = this.pose.bearing * radians;
    const p = project(this.pose.lon, this.pose.lat), northScale = 1 / Math.sin(this.pose.pitch * radians);
    const x = -dx * scale, z = -dy * scale * northScale;
    const point = unproject(p.x + x * Math.cos(theta) + z * Math.sin(theta), p.z - x * Math.sin(theta) + z * Math.cos(theta));
    this.pose.lon = point.lon; this.pose.lat = point.lat;
  }
  down(e: PointerInput) { this.flight = null; this.velocity = { x: 0, y: 0 }; this.pointers.set(e.id, e); this.travel = 0; this.downPoint = e; }
  move(e: PointerInput) {
    const previous = this.pointers.get(e.id); if (!previous) return;
    const dx = e.x - previous.x, dy = e.y - previous.y; this.travel += Math.hypot(dx, dy);
    if (this.pointers.size === 1) {
      if (e.button === 2 || e.shift) { this.pose.bearing -= dx * .25; this.pose.pitch += dy * .18; }
      else { this.pan(dx, dy); const dt = Math.max(8, e.time - previous.time); this.velocity = { x: dx / dt, y: dy / dt }; }
    } else {
      const other = [...this.pointers.values()].find(p => p.id !== e.id)!;
      const before = Math.hypot(previous.x - other.x, previous.y - other.y), after = Math.hypot(e.x - other.x, e.y - other.y);
      if (before > 10 && after > 10) this.targetDistance = this.pose.distance = clamp(this.pose.distance * before / after, 180, 11000);
      const angle = Math.atan2(e.y - other.y, e.x - other.x) - Math.atan2(previous.y - other.y, previous.x - other.x);
      this.pose.bearing -= Math.atan2(Math.sin(angle), Math.cos(angle)) / radians;
      this.pose.pitch += dy * .13; this.pan(dx * .5, 0); this.velocity = { x: 0, y: 0 };
    }
    this.pointers.set(e.id, e); this.sync();
  }
  up(e: PointerInput) { this.pointers.delete(e.id); if (!this.pointers.size && this.travel < 6 && this.downPoint && e.time - this.downPoint.time < 500) this.onPick?.(e.x, e.y); this.downPoint = null; if (this.reducedMotion) this.velocity = { x: 0, y: 0 }; }
  cancel() { this.pointers.clear(); this.velocity = { x: 0, y: 0 }; this.flight = null; this.targetDistance = this.pose.distance; }
  wheel(delta: number) { this.flight = null; this.targetDistance = clamp(this.targetDistance * Math.exp(clamp(delta, -240, 240) * .0015), 180, 11000); if (this.reducedMotion) this.pose.distance = this.targetDistance; }
  key(key: string) { const step = 50; if (key === 'ArrowLeft') this.pan(-step, 0); if (key === 'ArrowRight') this.pan(step, 0); if (key === 'ArrowUp') this.pan(0, -step); if (key === 'ArrowDown') this.pan(0, step); if (key === '+' || key === '=') this.wheel(-150); if (key === '-') this.wheel(150); if (key === 'Home') this.reset(); this.sync(); }
  update(dt: number) {
    dt = Math.min(dt, 50);
    if (this.flight) {
      this.flight.elapsed += dt; const t = Math.min(1, this.flight.elapsed / this.flight.duration), k = t * t * (3 - 2 * t);
      for (const key of ['lon', 'lat', 'distance', 'pitch', 'bearing'] as const) { let delta = this.flight.to[key] - this.flight.from[key]; if (key === 'bearing') delta = ((delta + 540) % 360) - 180; this.pose[key] = this.flight.from[key] + delta * k; }
      this.targetDistance = this.pose.distance; if (t === 1) this.flight = null;
    } else {
      this.pose.distance += (this.targetDistance - this.pose.distance) * (this.reducedMotion ? 1 : 1 - Math.exp(-dt / 90));
      if (!this.pointers.size && !this.reducedMotion) { this.pan(this.velocity.x * dt, this.velocity.y * dt); const drag = Math.exp(-dt / 220); this.velocity.x *= drag; this.velocity.y *= drag; if (Math.hypot(this.velocity.x, this.velocity.y) < .001) this.velocity = { x: 0, y: 0 }; }
    }
    this.sync();
  }
}
