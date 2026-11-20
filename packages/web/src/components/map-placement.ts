export interface MapRect { x: number; y: number; width: number; height: number }

export function mapOverlap(a: MapRect, b: MapRect, gap = 0) {
  return a.x < b.x+b.width+gap && b.x < a.x+a.width+gap && a.y < b.y+b.height+gap && b.y < a.y+a.height+gap;
}

export function mapObstacles(surface: DOMRect, selector: string) {
  return [...document.querySelectorAll(selector)].flatMap(node => {
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height || getComputedStyle(node).visibility === 'hidden') return [];
    return [{x:rect.x-surface.x,y:rect.y-surface.y,width:rect.width,height:rect.height}];
  });
}
