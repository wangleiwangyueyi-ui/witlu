/// <reference lib="webworker" />
import {layoutLabels} from '@witlu/core/places';import type {LabelInput} from '@witlu/core/places';
self.onmessage=(event:MessageEvent<{generation:number;items:LabelInput[];matrix:number[];width:number;height:number;limit:number;exclusions:{x:number;y:number;width:number;height:number}[]}>)=>{const d=event.data;self.postMessage({generation:d.generation,labels:layoutLabels(d.items,d.matrix,d.width,d.height,d.limit,d.exclusions)});};
