import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";
import ky from "ky";
import { env } from "../config/env.js";
import type { NeynarCast, NeynarUser, NeynarWebhook } from "../types/neynar.js";

const NEYNAR_API_BASE_URL = "https://api.neynar.com/v2/farcaster";

const MAX_CASTS_PER_REQUEST = 150;
const MAX_REPLIES_PER_REQUEST = 50;

const config = new Configuration({
	apiKey: env.NEYNAR_API_KEY,
});

const neynarClient = new NeynarAPIClient(config);

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

/**
 * Fetch multiple users from Neynar
 * @param fids - comma separated FIDs of the users to fetch
 * @returns The users
 */
export const fetchBulkUsersFromNeynar = async (
	fids: number[],
	viewerFid?: number,
) => {
	if (!fids) {
		return [];
	}

	const data = await neynarClient.fetchBulkUsers({
		fids,
		viewerFid,
	});

	return data.users || [];
};

/**
 * Fetch a single user from Neynar
 * @param fid - The FID of the user to fetch
 * @returns The user
 */
export const fetchUserFromNeynarByFid = async (fid: number) => {
	if (!fid) {
		return null;
	}
	const users = await fetchBulkUsersFromNeynar([fid]);
	if (!users || users.length === 0) return null;
	return users[0];
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
	const parentCastsMap = new Map(parentCasts.map((cast) => [cast.hash, cast]));

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

/**
 * Get a webhook from Neynar by ID
 * @param webhookId - The ID of the webhook to get
 * @returns The webhook
 */
export const getNeynarWebhookById = async (webhookId: string) => {
	const data = await neynarClient.lookupWebhook({
		webhookId,
	});
	console.log("data", JSON.stringify(data, null, 2));
	if (
		!("webhook" in data) ||
		!data.webhook ||
		("success" in data && !data.success)
	) {
		return null;
	}
	return data.webhook as NeynarWebhook;
};

/**
 * Update a webhook in Neynar, updating the subscription for the trade.created event
 * @param webhookId - The ID of the webhook to update
 * @param fids - The FIDs of the users to track on to the webhook
 * @returns
 */
export const updateNeynarWebhookCastCreated = async ({
	webhookId,
	webhookUrl,
	webhookName,
	fids,
}: {
	webhookId: string;
	webhookUrl: string;
	webhookName: string;
	fids: number[];
}) => {
	const data = await neynarClient.updateWebhook({
		name: webhookName,
		url: webhookUrl,
		webhookId,
		subscription: {
			"cast.created": {
				mentioned_fids: fids,
			},
		},
	});
	console.log("neynarClient.updateWebhook", JSON.stringify(data, null, 2));

	if (
		!("webhook" in data) ||
		!data.webhook ||
		("success" in data && !data.success)
	) {
		console.error("Failed to update webhook", JSON.stringify(data, null, 2));
	}
	return data;
};

/**
 * Fetch a fresh FID from Neynar for account creation
 * @returns The FID
 */
export const fetchFreshFid = async (): Promise<number> => {
	const fidResponse = await ky
		.get<{ fid: number }>("https://api.neynar.com/v2/farcaster/user/fid", {
			headers: {
				"x-api-key": env.NEYNAR_API_KEY,
			},
		})
		.json();

	return fidResponse.fid;
};

/**
 * Check if a Farcaster username is available
 * @param fname - The username to check
 * @returns Whether the username is available
 */
export const checkFnameAvailability = async (
	fname: string,
): Promise<boolean> => {
	const response = await ky
		.get<{ available: boolean }>(
			"https://api.neynar.com/v2/farcaster/fname/availability",
			{
				searchParams: { fname },
				headers: {
					"x-api-key": env.NEYNAR_API_KEY,
				},
			},
		)
		.json();

	return response.available;
};

/**
 * Register a new Farcaster account with Neynar
 * @param params - The registration parameters
 * @returns The registration response
 */
export const registerFarcasterAccount = async (params: {
	fid: number;
	signature: string;
	custodyAddress: string;
	deadline: number;
	fname: string;
	metadata: {
		bio: string;
		pfp_url: string;
		url: string;
		display_name: string;
	};
}): Promise<{ success: boolean }> => {
	const registerResponse = await fetch(
		"https://api.neynar.com/v2/farcaster/user",
		{
			method: "POST",
			headers: {
				"x-api-key": env.NEYNAR_API_KEY,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				fid: params.fid,
				signature: params.signature,
				// requestedUserCustodyAddress: params.custodyAddress,
				requested_user_custody_address: params.custodyAddress,
				deadline: params.deadline,
				fname: params.fname,
				metadata: params.metadata,
			}),
		},
	);

	if (!registerResponse.ok) {
		const errorData = await registerResponse.json();
		throw new Error(
			`Failed to register Farcaster account on Neynar: ${JSON.stringify(
				errorData,
			)}`,
		);
	}

	const data = (await registerResponse.json()) as { success: boolean };
	return data;
};

/**
 * Post a cast to Farcaster using Neynar
 * @param signerUuid - The UUID of the signer
 * @param text - The text of the cast
 * @param embeds - The embeds of the cast
 * @param parentHash - The hash of the parent cast
 * @param idempotencyKey - The idempotency key
 * @param authorFid - The FID of the author
 * @returns The cast
 */
export const postCastToFarcaster = async ({
	signerUuid,
	text,
	embeds,
	parentHash,
	idempotencyKey,
	authorFid,
}: {
	signerUuid: string;
	text: string;
	embeds?: string[];
	idempotencyKey: string;
	parentHash: string;
	authorFid: number;
}) => {
	const data = await neynarClient.publishCast({
		signerUuid,
		text,
		idem: idempotencyKey,
		parent: parentHash,
		parentAuthorFid: authorFid,
		embeds: embeds?.map((embed) => ({ url: embed })),
	});
	return data;
};
