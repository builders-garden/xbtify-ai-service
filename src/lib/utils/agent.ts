import type { NeynarCast } from "../../types/neynar.js";
import type { NeynarReplyWithParentCast } from "../neynar.js";

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

export function extractReplyDataForDb(neynarReply: NeynarReplyWithParentCast) {
	return {
		fid: neynarReply.author.fid,
		text: neynarReply.text,
		hash: neynarReply.hash,
		parentText: neynarReply.parentCast?.text || "",
		parentAuthorFid: neynarReply.parentCast?.author.fid.toString() || "",
		createdAt: new Date(neynarReply.timestamp),
	};
}

export function extractRepliesDataForDb(replies: NeynarReplyWithParentCast[]) {
	return replies.map(extractReplyDataForDb);
}

export function filterRepliesByLength(
	replies: NeynarReplyWithParentCast[],
	minLength: number,
) {
	return replies.filter((reply) => reply.text.length > minLength);
}
