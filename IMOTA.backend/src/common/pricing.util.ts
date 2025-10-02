export function calcFareCents(cfg:any,km:number,min:number){const raw=cfg.base+cfg.perKm*km+cfg.perMin*min;const surged=raw*(cfg.surge||1);return Math.max(cfg.minimum,Math.round(surged));}
