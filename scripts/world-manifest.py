"""Read alpha components to record source frames. Never edits image pixels."""
from PIL import Image
from scipy import ndimage
import numpy as np
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
characters=['keeper','office','driver','student','uncle','tourist','reviewer','celebrity','creator']
parts=['idle','blink','happy','angry','body','rightArm','leftArm','leftLeg','rightLeg']
sizes={'idle':[50,57],'blink':[50,57],'happy':[50,57],'angry':[50,57],'body':[46,48],'rightArm':[20,46],'leftArm':[20,46],'leftLeg':[21,33],'rightLeg':[21,33]}
origins={p:[.5,1] for p in parts[:4]}
origins.update({'body':[.5,0],'rightArm':[.27,.07],'leftArm':[.73,.07],'leftLeg':[.65,0],'rightLeg':[.35,0]})
main_sizes={'facade':[480,285],'awning':[490,48],'stool':[52,37],'pavement':[480,108],'table':[480,270],'sign':[270,80],'fan':[43,65],'motorbike':[64,48],'festival':[480,34]}
assets={}
for path in sorted((root/'public/assets/world').glob('*.png')):
 id=path.stem; im=Image.open(path).convert('RGBA'); w,h=im.size
 labels,count=ndimage.label(np.asarray(im)[:,:,3]>64)
 counts=np.bincount(labels.ravel()); components=[]
 for i,sl in enumerate(ndimage.find_objects(labels),1):
  if counts[i]<500 or sl is None:continue
  yy,xx=sl;components.append((int(counts[i]),[max(0,xx.start-1),max(0,yy.start-1),min(w,xx.stop+1)-max(0,xx.start-1),min(h,yy.stop+1)-max(0,yy.start-1)]))
 frames={}
 if id in characters:
  boxes=[b for _,b in sorted(components,reverse=True)[:9]]
  for index,p in enumerate(parts):
   col=index%3;row=index//3;cx=(col+.5)*w/3;cy=(row+.5)*h/3
   box=min(boxes,key=lambda b:(b[0]+b[2]/2-cx)**2+(b[1]+b[3]/2-cy)**2)
   boxes.remove(box);frames[p]={'rect':box,'size':sizes[p],'origin':origins[p]}
  # Prevent neighbouring trouser pixels entering the bottom of an arm frame.
  frames['rightArm']['rect'][3]=min(frames['rightArm']['rect'][3],frames['rightLeg']['rect'][1]-2-frames['rightArm']['rect'][1])
 elif id.startswith('plant-'):
  boxes=sorted([b for _,b in sorted(components,reverse=True)[:2]],key=lambda b:b[0])
  hanging=id=='plant-hanging'
  for p,b,size,origin in [('pot',boxes[0],[43,80] if hanging else [42,34],[.5,1]),('leaves',boxes[1],[62,74] if hanging else [60,70],[.5,.43] if hanging else [.5,1])]:frames[p]={'rect':b,'size':size,'origin':origin}
 elif id=='fan':
  boxes=sorted([b for _,b in sorted(components,reverse=True)[:2]],key=lambda b:b[0])
  for p,b,size in [('body',boxes[0],[43,65]),('blades',boxes[1],[31,31])]:frames[p]={'rect':b,'size':size,'origin':[.5,.5]}
 else:
  box=[0,0,w,h] if id in ['facade','table','pavement'] else sorted(components,reverse=True)[0][1]
  frames['main']={'rect':box,'size':main_sizes[id],'origin':[.5,.5]}
 assets[id]={'file':path.name,'sourceSize':[w,h],'maxSize':1024 if id in characters else 1536 if id in ['facade','table','pavement','awning','festival'] else 768,'frames':frames}
 print(id, {k:v['rect'] for k,v in frames.items()})
(root/'src/rendering/worldManifest.json').write_text(json.dumps({'version':1,'characters':characters,'assets':assets},indent=2)+'\n')
