/** biome-ignore-all lint/suspicious/noExplicitAny: we dont know it */
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
