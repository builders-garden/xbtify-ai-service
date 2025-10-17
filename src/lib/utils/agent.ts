import { NeynarCast } from "../../types/neynar.js";

export function extractCastDataForDb(neynarCast: NeynarCast) {
  return {
    fid: neynarCast.author.fid,
    text: neynarCast.text,
    hash: neynarCast.hash,
    createdAt: new Date(neynarCast.timestamp),
  };
}

export function extractCastsDataForDb(casts: NeynarCast[]) {
  return casts.map(extractCastDataForDb);
}

export function filterCastsByLength(casts: NeynarCast[], minLength: number) {
  return casts.filter((cast) => cast.text.length > minLength);
}
