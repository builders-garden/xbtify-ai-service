/** biome-ignore-all lint/suspicious/noExplicitAny: we dont know it */
import type {
	WebhookCastCreated,
	WebhookFollowCreated,
	WebhookFollowDeleted,
	WebhookReactionCreated,
	WebhookReactionDeleted,
	WebhookUserCreated,
	WebhookUserUpdated,
} from "@neynar/nodejs-sdk";
import type {
	Webhook,
	WebhookSubscription,
	WebhookSubscriptionFilters,
} from "@neynar/nodejs-sdk/build/api/index.js";
import * as z from "zod";

type Address = {
	city: string;
	state: string;
	country: string;
	country_code: string;
};

type ChannelDehydrated = {
	object: "channel_dehydrated";
	id: string;
	name: string;
	image_url?: string;
};

type UserDehydrated = {
	object: "user_dehydrated";
	fid: number;
	username?: string;
	display_name?: string;
	pfp_url?: string;
	custody_address?: string;
};

type MentionedChannel = ChannelDehydrated;

type MentionedChannelRange = {
	start: number;
	end: number;
};

type ProStatus = {
	status: string;
	subscribed_at: string;
	expires_at: string;
};

type AuthAddress = {
	address: string;
	app: UserDehydrated;
};

type Experimental = {
	neynar_user_score: number;
	deprecation_notice: string;
};

export type NeynarUser = {
	object: "user";
	fid: number;
	username: string;
	display_name: string;
	pfp_url: string | null;
	custody_address: string;
	pro?: ProStatus;
	profile: {
		bio: {
			text: string;
			mentioned_channels?: MentionedChannel[];
			mentioned_channels_ranges?: MentionedChannelRange[];
		};
		mentioned_profiles?: [
			{
				object: string;
				fid: number;
				username: string;
				display_name: string;
				pfp_url: string;
				custody_address: string;
			},
		];
		location?: {
			latitude: number;
			longitude: number;
			address: Address;
		};
		banner?: {
			url: string;
		};
	};
	follower_count: number;
	following_count: number;
	verifications: string[];
	verified_addresses: {
		eth_addresses: string[];
		sol_addresses: string[];
		primary: {
			eth_address: string;
			sol_address: string;
		};
	};
	auth_addresses?: AuthAddress[];
	verified_accounts: {
		platform: string;
		username: string;
	}[];
	power_badge: boolean;
	url?: string;
	experimental?: Experimental;
	score: number;
};

type CastEmbedCastId = {
	fid: number;
	hash: string;
};

export type NeynarCreateFarcasterUserResponse = {
	success: boolean;
	signer: {
		object: "signer";
		signer_uuid: string;
		public_key: string;
		status: string;
		signer_approval_url: string;
		fid: number;
		permissions: string[];
	};
};

type ImageMetadata = {
	content_type: string;
	content_length: number;
	_status: string;
	image?: {
		width_px: number;
		height_px: number;
	};
};

type CastEmbedUrl = {
	url: string;
	metadata?: ImageMetadata;
};

type CastDehydrated = {
	object: "cast_dehydrated";
	hash: string;
	author: UserDehydrated;
	app: UserDehydrated;
};

type CastEmbedded = {
	object: "cast_embedded";
	hash: string;
	author: UserDehydrated;
	app: UserDehydrated;
	thread_hash: string;
	parent_hash: string | null;
	parent_url: string | null;
	root_parent_url: string | null;
	parent_author: {
		fid: number | null;
	};
	text: string;
	timestamp: string;
	embeds: CastEmbed[];
	channel?: ChannelDehydrated | null;
};

type CastEmbedCast = {
	cast_id: CastEmbedCastId;
	cast: CastEmbedded | CastDehydrated;
};

type CastEmbed = CastEmbedCast | CastEmbedUrl;

type Reactions = {
	likes_count: number;
	recasts_count: number;
	likes: any[];
	recasts: any[];
};

type Replies = {
	count: number;
};

export type NeynarCast = {
	object: "cast";
	hash: string;
	author: NeynarUser;
	app: UserDehydrated;
	thread_hash: string;
	parent_hash: string | null;
	parent_url: string | null;
	root_parent_url: string | null;
	parent_author: {
		fid: number | null;
	};
	text: string;
	timestamp: string;
	embeds: CastEmbed[];
	channel: ChannelDehydrated | null;
	reactions: Reactions;
	replies: Replies;
	mentioned_profiles: any[];
	mentioned_profiles_ranges: any[];
	mentioned_channels: MentionedChannel[];
	mentioned_channels_ranges: MentionedChannelRange[];
};

export type CastsResponse = {
	casts: NeynarCast[];
	next: {
		cursor: string;
	};
};

// WEBHOOKS
/**
 * New subscription filter for the trade.created event
 */
export const tradeCreatedSubscriptionFilterSchema = z.object({
	fids: z.array(z.number()),
	minimum_trader_neynar_score: z.number(),
	minimum_token_amount_usdc: z.number(),
});

/**
 * Extended webhook subscription filters including trade.created.
 * Other existing keys from the SDK are typed as unknown to avoid duplication.
 */
export const neynarWebhookSubscriptionFiltersSchema = z
	.custom<WebhookSubscriptionFilters>()
	.and(
		z.object({
			"trade.created": tradeCreatedSubscriptionFilterSchema,
		}),
	);

export const neynarWebhookSubscriptionSchema = z
	.custom<WebhookSubscription>()
	.and(
		z.object({
			filters: neynarWebhookSubscriptionFiltersSchema,
		}),
	);

export const neynarWebhookSchema = z.custom<Webhook>().and(
	z.object({
		subscription: neynarWebhookSubscriptionSchema,
	}),
);
export type NeynarWebhook = z.infer<typeof neynarWebhookSchema>;

export const neynarWebhookFailureSchema = z.object({
	code: z.string(),
	message: z.string(),
	property: z.string(),
	status: z.number(),
});

export const neynarWebhookSuccessSchema = z.object({
	message: z.string(),
	success: z.literal(true),
	webhook: neynarWebhookSchema,
});
export type NeynarWebhookSuccessResponse = z.infer<
	typeof neynarWebhookSuccessSchema
>;

export const neynarWebhookResponseSchema = z.union([
	neynarWebhookSuccessSchema,
	neynarWebhookFailureSchema,
]);
export type NeynarWebhookResponse = z.infer<typeof neynarWebhookResponseSchema>;

/**
 * Trade created event
 */
export const userDehydratedSchema = z.object({
	object: z.literal("user_dehydrated"),
	fid: z.number(),
	score: z.number(),
});

export const tokenBalanceSchema = z.object({
	object: z.literal("token_balance"),
	token: z.object({
		object: z.literal("token"),
		address: z.string(),
		decimals: z.number(),
		symbol: z.string(),
		name: z.string(),
	}),
	balance: z.object({
		in_usdc: z.number().nullable(),
		in_token: z.string().nullable(),
	}),
});

export const poolSchema = z.object({
	object: z.literal("pool"),
	address: z.string(),
	protocol_family: z.string().optional(),
	protocol_version: z.string().optional(),
});

export const webhookTradeCreatedSchema = z.object({
	type: z.literal("trade.created"),
	data: z.object({
		object: z.literal("trade"),
		trader: userDehydratedSchema.nullable(),
		pool: poolSchema,
		transaction: z.object({
			hash: z.string(),
			network: z.object({
				object: z.literal("network"),
				name: z.string(),
			}),
			net_transfer: z.object({
				object: z.literal("net_transfer"),
				receiving_token: tokenBalanceSchema,
				sending_token: tokenBalanceSchema,
			}),
		}),
	}),
});

export type WebhookTradeCreated = z.infer<typeof webhookTradeCreatedSchema>;

/**
 * Other webhook events
 */
const webhookFollowCreatedSchema = z.custom<WebhookFollowCreated>();
const webhookFollowDeletedSchema = z.custom<WebhookFollowDeleted>();
const webhookReactionCreatedSchema = z.custom<WebhookReactionCreated>();
const webhookReactionDeletedSchema = z.custom<WebhookReactionDeleted>();
const webhookCastCreatedSchema = z.custom<WebhookCastCreated>();
const webhookUserCreatedSchema = z.custom<WebhookUserCreated>();
const webhookUserUpdatedSchema = z.custom<WebhookUserUpdated>();

export const allWebhookEventsSchema = z.union([
	webhookFollowCreatedSchema,
	webhookFollowDeletedSchema,
	webhookReactionCreatedSchema,
	webhookReactionDeletedSchema,
	webhookCastCreatedSchema,
	webhookUserCreatedSchema,
	webhookUserUpdatedSchema,
	webhookTradeCreatedSchema,
]);

export type WebhookEvent = z.infer<typeof allWebhookEventsSchema>;
