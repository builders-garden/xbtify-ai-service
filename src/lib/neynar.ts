import ky from "ky";
import type { NeynarCast, NeynarUser } from "@/types/neynar.js";
import { env } from "../config/env.js";

const NEYNAR_API_BASE_URL = "https://api.neynar.com/v2/farcaster";
const MAX_CASTS_PER_REQUEST = 150;
const MAX_REPLIES_PER_REQUEST = 50;

export type NeynarUserResponse = {
	users: NeynarUser[];
};

export type NeynarReplyWithParentCast = NeynarCast & {
	parentCast: NeynarCast | null;
};

type NeynarCastsResponse = {
	casts: NeynarCast[];
	next?: {
		cursor: string | null;
	};
};

type NeynarFetchBulkCastsResponse = {
	result: {
		casts: NeynarCast[];
	};
};

export const fetchUserCasts = async ({
	fid,
	limit = 150,
}: {
	fid: number;
	limit?: number;
}): Promise<NeynarCast[]> => {
	const allCasts: NeynarCast[] = [];
	let cursor: string | null | undefined;
	let remainingLimit = limit;

	do {
		const currentLimit = Math.min(remainingLimit, MAX_CASTS_PER_REQUEST);

		const searchParams: Record<string, string | number> = {
			fid,
			limit: currentLimit,
			include_replies: "false",
		};

		if (cursor) {
			searchParams.cursor = cursor;
		}

		const response = await ky.get(`${NEYNAR_API_BASE_URL}/feed/user/casts`, {
			searchParams,
			headers: {
				"x-api-key": env.NEYNAR_API_KEY,
			},
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(
				`Failed to fetch Farcaster user casts on Neynar: ${JSON.stringify(
					errorData,
				)}`,
			);
		}

		const data = (await response.json()) as NeynarCastsResponse;

		if (!data.casts) {
			throw new Error("No casts found in Neynar response");
		}

		allCasts.push(...data.casts);
		remainingLimit -= data.casts.length;

		// Check if we should continue paginating
		cursor = data.next?.cursor;

		// Stop if we've fetched enough casts or there's no more data
		if (remainingLimit <= 0 || !cursor) {
			break;
		}
	} while (cursor);

	return allCasts;
};

export const fetchUserReplies = async ({
	fid,
	limit = 50,
}: {
	fid: number;
	limit?: number;
}): Promise<NeynarCast[]> => {
	const allReplies: NeynarCast[] = [];
	let cursor: string | null | undefined;
	let remainingLimit = limit;

	do {
		const currentLimit = Math.min(remainingLimit, MAX_REPLIES_PER_REQUEST);

		const searchParams: Record<string, string | number> = {
			fid,
			limit: currentLimit,
			filter: "replies",
		};

		if (cursor) {
			searchParams.cursor = cursor;
		}

		const response = await ky.get(
			`${NEYNAR_API_BASE_URL}/feed/user/replies_and_recasts`,
			{
				searchParams,
				headers: {
					"x-api-key": env.NEYNAR_API_KEY,
				},
			},
		);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(
				`Failed to fetch Farcaster user replies on Neynar: ${JSON.stringify(
					errorData,
				)}`,
			);
		}

		const data = (await response.json()) as NeynarCastsResponse;

		if (!data.casts) {
			throw new Error("No replies found in Neynar response");
		}

		allReplies.push(...data.casts);
		remainingLimit -= data.casts.length;

		// Check if we should continue paginating
		cursor = data.next?.cursor;

		// Stop if we've fetched enough replies or there's no more data
		if (remainingLimit <= 0 || !cursor) {
			break;
		}
	} while (cursor);

	return allReplies;
};

export const fetchCastsByHashes = async ({
	hashes,
}: {
	hashes: string[];
}): Promise<NeynarCast[]> => {
	if (hashes.length === 0) return [];

	const allCasts: NeynarCast[] = [];
	let cursor: string | null | undefined;

	do {
		const searchParams: Record<string, string> = {
			casts: hashes.join(","),
		};

		if (cursor) {
			searchParams.cursor = cursor;
		}

		const response = await ky.get(`${NEYNAR_API_BASE_URL}/casts`, {
			searchParams,
			headers: {
				"x-api-key": env.NEYNAR_API_KEY,
			},
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(
				`Failed to fetch Farcaster casts by hashes on Neynar: ${JSON.stringify(
					errorData,
				)}`,
			);
		}

		const data = (await response.json()) as NeynarFetchBulkCastsResponse;

		if (!data.result.casts) {
			throw new Error("No casts found in Neynar response");
		}

		allCasts.push(...data.result.casts);

		// Check if we should continue paginating
		cursor = undefined;

		// Stop if there's no more data
		if (!cursor) {
			break;
		}
	} while (cursor);

	return allCasts;
};

export const fetchUserRepliesWithParentCast = async ({
	fid,
	limit = 50,
}: {
	fid: number;
	limit?: number;
}): Promise<NeynarReplyWithParentCast[]> => {
	// First, fetch all user replies
	const replies = await fetchUserReplies({ fid, limit });

	if (replies.length === 0) {
		return [];
	}

	// Extract unique parent hashes from replies
	const parentHashes = [
		...new Set(
			replies
				.map((reply) => reply.parent_hash)
				.filter((hash): hash is string => hash !== null),
		),
	];

	if (parentHashes.length === 0) {
		// If no parent hashes, return replies with null parent casts
		return replies.map((reply) => ({
			...reply,
			parentCast: null,
		}));
	}

	// Fetch all parent casts in bulk
	const parentCasts = await fetchCastsByHashes({ hashes: parentHashes });

	// Create a map of parent casts by hash for quick lookup
	const parentCastsMap = new Map(
		parentCasts.map((cast) => [cast.hash, cast]),
	);

	// Combine replies with their parent casts
	const repliesWithParentCasts: NeynarReplyWithParentCast[] = replies.map(
		(reply) => ({
			...reply,
			parentCast: reply.parent_hash
				? parentCastsMap.get(reply.parent_hash) || null
				: null,
		}),
	);

	return repliesWithParentCasts;
};

