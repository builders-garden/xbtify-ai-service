import ky from "ky";
import type { NeynarCast, NeynarUser } from "@/types/neynar.js";
import { env } from "../config/env.js";

const NEYNAR_API_BASE_URL = "https://api.neynar.com/v2/farcaster";

export type NeynarUserResponse = {
	users: NeynarUser[];
};

type NeynarCastsResponse = {
	casts: NeynarCast[];
	next?: {
		cursor: string | null;
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
	const maxPerRequest = 150;
	let remainingLimit = limit;

	do {
		const currentLimit = Math.min(remainingLimit, maxPerRequest);

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
