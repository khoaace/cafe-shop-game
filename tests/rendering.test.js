import test from 'node:test';
import assert from 'node:assert/strict';
import { renderFactor, pointerToWorld } from '../src/rendering/resolution.js';

test('render factor follows display fit and capped pixel density', () => {
  for (const [w,h,dpr,expected] of [[1366,768,1,1],[1366,768,2,2],[1920,1080,1,2],[1920,1080,2,3],[2560,1440,1,2],[2560,1440,2,4],[360,800,3,2],[480,800,1,1],[1920,1080,0.5,1]]) {
    assert.equal(renderFactor(w,h,dpr), expected, `${w} × ${h}, DPR ${dpr}`);
  }
});
test('render factor respects GPU maximum dimensions and safe lower bounds', () => {
  assert.equal(renderFactor(8000,8000,4),4);
  assert.equal(renderFactor(2560,1440,2,2048),2);
  assert.equal(renderFactor(2560,1440,2,1024),1);
  assert.equal(renderFactor(0,0,0),1);
});
test('pointer mapping delegates to camera transform and keeps input untouched', () => {
  for (const factor of [1,2,3,4]) {
    const pointer={x:240*factor,y:517*factor,id:3}; const out={};
    const camera={getWorldPoint(x,y,result){result.x=x/factor;result.y=y/factor;return result;}};
    assert.equal(pointerToWorld(pointer,camera,out),out);
    assert.deepEqual(out,{x:240,y:517}); assert.equal(pointer.x,240*factor);
  }
});
test('mapping includes camera offsets rather than assuming a fixed multiplier', () => {
  const camera={getWorldPoint(x,y,out){out.x=x/2+20;out.y=y/2-12;return out;}};
  assert.deepEqual(pointerToWorld({x:100,y:200},camera),{x:70,y:88});
});
