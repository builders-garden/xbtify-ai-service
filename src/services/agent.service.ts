import { env } from "../config/env.js";
import { runInitAgent } from "../lib/agent/init_agent.js";
import type { Agent, Cast, Reply } from "../lib/database/db.schema.js";
import {
	createAgent,
	getAgentByFid,
	getAllAgentsFids,
	updateAgent,
} from "../lib/database/queries/agent.query.js";
import {
	createCasts,
	deleteAllCastsByFid,
	getCastsByFid,
} from "../lib/database/queries/cast.query.js";
import {
	createReplies,
	deleteAllRepliesByFid,
	getRepliesByFid,
} from "../lib/database/queries/reply.query.js";
import { createFarcasterAccount } from "../lib/farcaster.js";
import {
	fetchUserCasts,
	fetchUserFromNeynarByFid,
	fetchUserRepliesWithParentCast,
	updateNeynarWebhookCastCreated,
} from "../lib/neynar.js";
import {
	extractCastsDataForDb,
	extractRepliesDataForDb,
	filterCastsByLength,
	filterRepliesByLength,
} from "../lib/utils/agent.js";
import { getCleanFarcasterUsername } from "../lib/utils.js";
import { AgentStatus } from "../types/enums.js";
import type { AgentInitJobData } from "../types/queue.type.js";

const minLength = 30;

export const initAgent = async (data: AgentInitJobData) => {
	try {
		console.log("[agent.service]: initAgent called");

		// step 0. get farcaster user
		const farcasterUser = await fetchUserFromNeynarByFid(data.fid);
		if (!farcasterUser) {
			throw new Error(`Farcaster user not found for fid ${data.fid}`);
		}

		const newFname = `${getCleanFarcasterUsername(farcasterUser.username)}xbt`;
		const newDisplayName = `${farcasterUser.display_name ?? farcasterUser.username} XBT`;
		// TODO convert add negative filter to pfp and store in s3
		const pfpUrl = farcasterUser.pfp_url; //? await stylizeImage(farcasterUser.pfp_url) : undefined;

		// step 1: create farcaster user
		const farcasterAccount = await createFarcasterAccount({
			fname: newFname,
			displayName: newDisplayName,
			bio: `digital twin of @${farcasterUser.username}`,
			pfpUrl: pfpUrl,
			url: `https://xbtify.vercel.app/${farcasterUser.fid}`,
		});
		console.log("Farcaster account created:", {
			fid: farcasterAccount.fid,
			fname: farcasterAccount.fname,
			custodyAddress: farcasterAccount.custodyAddress,
		});

		// step 1.b: update neynar webhook
		const allFids = await getAllAgentsFids();
		// use set to avoid duplicates
		const allFidsSet = new Set([...allFids, data.fid]);

		await updateNeynarWebhookCastCreated({
			webhookId: env.NEYNAR_WEBHOOK_ID,
			webhookUrl: `${env.BACKEND_URL}/api/v1/neynar/webhooks`,
			webhookName: "XBTify webhook",
			fids: Array.from(allFidsSet),
		});

		// step 2: store agent in database
		const agent = await storeNewAgentInDb({
			fid: farcasterAccount.fid,
			creatorFid: data.fid,
			status: AgentStatus.INITIALIZING,
			personality: data.personality,
			tone: data.tone,
			movieCharacter: data.movieCharacter,
			username: newFname,
			displayName: newDisplayName,
			custodyAddress: farcasterAccount.custodyAddress,
			mnemonic: farcasterAccount.mnemonic,
			avatarUrl: pfpUrl,
		});
		console.log(`Agent stored in database:${agent.id}`);

		// step 3: fetch and store fresh casts
		// const { casts, count } = await fetchAndStoreFarcasterCasts(data.fid);
		const casts = await getCastsByFid(data.fid);
		const count = casts.length;

		// step 4. get replies
		// const { replies, count: repliesCount } = await fetchAndStoreFarcasterReplies(data.fid);

		// step 5: generate style_profile_prompt base on casts
		const style_profile_prompt = await runInitAgent(
			casts.map((cast) => cast.text).join("\n"),
		);

		// step 6: update style_profile_prompt for agent
		const updatedAgent = await updateAgent(agent.id, {
			status: AgentStatus.READY,
			styleProfilePrompt: style_profile_prompt.response,
		});
		console.log(`Agent updated:${updatedAgent?.id}`);

		return {
			fid: data.fid,
			agent: {
				id: updatedAgent?.id,
				fid: updatedAgent?.fid,
				username: updatedAgent?.username,
				creatorFid: updatedAgent?.creatorFid,
				status: updatedAgent?.status,
				personality: updatedAgent?.personality,
				tone: updatedAgent?.tone,
				movieCharacter: updatedAgent?.movieCharacter,
			},
			importedCasts: count,
		};
	} catch (error) {
		console.error("[agent.service]:", error);
		throw error;
	}
};

export const reinitializeAgent = async ({
	fid,
	deleteCasts,
	deleteReplies,
}: {
	fid: number;
	deleteCasts: boolean;
	deleteReplies: boolean;
}) => {
	try {
		// Farcaster casts
		// step 1: delete all existing casts for the user
		console.log(
			`[agent.service|${new Date().toISOString()}]: reinitializing agent for fid ${fid}, deleteCasts=${deleteCasts}, deleteReplies=${deleteReplies}`,
		);

		let deletedCastsCount = 0;
		let deletedRepliesCount = 0;
		let importedCastsCount = 0;
		let importedRepliesCount = 0;
		let storedCasts: Cast[] = [];
		let storedReplies: Reply[] = [];
		console.log("storedReplies", storedReplies);
		if (deleteCasts) {
			deletedCastsCount = await deleteAllCastsByFid(fid);
			console.log(
				`[agent.service|${new Date().toISOString()}]: deleted ${deletedCastsCount} existing casts for fid ${fid}`,
			);
			// step 2: fetch and store fresh casts
			const { casts, count } = await fetchAndStoreFarcasterCasts(fid);
			storedCasts = casts;
			importedCastsCount = count;
		} else {
			storedCasts = await getCastsByFid(fid);
		}

		if (deleteReplies) {
			deletedRepliesCount = await deleteAllRepliesByFid(fid);
			console.log(
				`[agent.service|${new Date().toISOString()}]: deleted ${deletedRepliesCount} existing replies for fid ${fid}`,
			);
			// step 3: fetch and store fresh replies
			const { replies, count } = await fetchAndStoreFarcasterReplies(fid);
			storedReplies = replies;
			importedRepliesCount = count;
		} else {
			storedReplies = await getRepliesByFid(fid);
		}

		// step 3: generate style_profile_prompt base on casts
		const style_profile_prompt = await runInitAgent(
			storedCasts.map((cast) => cast.text).join("\n"),
		);
		console.log(
			`[agent.service]: generated style_profile_prompt base on casts: ${style_profile_prompt}`,
		);

		// step 4: update or create agent in database
		await updateOrCreateAgent(
			fid,
			AgentStatus.REINITIALIZING,
			style_profile_prompt.response,
		);

		return {
			fid,
			deletedCasts: deletedCastsCount,
			deletedReplies: deletedRepliesCount,
			importedCasts: importedCastsCount,
			importedReplies: importedRepliesCount,
		};
	} catch (error) {
		console.error("[agent.service]:", error);
		throw error;
	}
};

export const handleAskAgent = async ({
	agent,
	question,
}: {
	agent: Agent;
	question: string;
}): Promise<{
	answer: string;
	agentData: Agent;
}> => {
	// TODO: add here the logic to handle the question with the agent

	return {
		answer: `This is a placeholder answer to your question: "${question}"`,
		agentData: agent,
	};
};

async function fetchAndStoreFarcasterCasts(fid: number) {
	// step 1: fetch user casts
	console.log(
		`[agent.service|${new Date().toISOString()}]: fetching casts for fid ${fid}`,
	);
	const casts = await fetchUserCasts({ fid, limit: 2000 });
	console.log(
		`[agent.service|${new Date().toISOString()}]: fetched ${casts.length} casts`,
	);
	// step 2: filter casts by length
	const filteredCasts = filterCastsByLength(casts, minLength);
	console.log(
		`[agent.service|${new Date().toISOString()}]: filtered to ${
			filteredCasts.length
		} casts (min length: ${minLength})`,
	);
	// step 3: extract user's cast text
	const extractedData = extractCastsDataForDb(casts);
	console.log(
		`[agent.service|${new Date().toISOString()}]: extracted ${
			extractedData.length
		} casts for db`,
	);
	// step 4: save casts to database
	await createCasts(extractedData);
	console.log(
		`[agent.service|${new Date().toISOString()}]: saved casts to database`,
	);

	return {
		fid,
		casts: extractedData,
		count: extractedData.length,
	};
}

async function fetchAndStoreFarcasterReplies(fid: number) {
	// step 1: fetch user replies with parent casts
	console.log(
		`[agent.service|${new Date().toISOString()}]: fetching replies for fid ${fid}`,
	);
	const replies = await fetchUserRepliesWithParentCast({ fid, limit: 100 });
	console.log(
		`[agent.service|${new Date().toISOString()}]: fetched ${replies.length} replies`,
	);

	// step 2: filter replies by length (just > 0 so we have some text)
	const filteredReplies = filterRepliesByLength(replies, 0);
	console.log(
		`[agent.service|${new Date().toISOString()}]: filtered to ${
			filteredReplies.length
		} replies (min length: 0)`,
	);

	// step 3: extract reply data for database
	const extractedData = extractRepliesDataForDb(filteredReplies);
	console.log(
		`[agent.service|${new Date().toISOString()}]: extracted ${
			extractedData.length
		} replies for db`,
	);

	// step 4: save replies to database
	await createReplies(extractedData);
	console.log(
		`[agent.service|${new Date().toISOString()}]: saved replies to database`,
	);

	return {
		fid,
		replies: extractedData,
		count: extractedData.length,
	};
}

async function storeNewAgentInDb({
	fid,
	creatorFid,
	status,
	styleProfilePrompt,
	personality,
	tone,
	movieCharacter,
	username,
	displayName,
	custodyAddress,
	mnemonic,
	avatarUrl,
}: {
	fid: number;
	creatorFid: number;
	status: AgentStatus;
	styleProfilePrompt?: string;
	personality: string;
	tone: string;
	movieCharacter: string;
	username: string;
	displayName: string;
	custodyAddress: string;
	mnemonic: string;
	avatarUrl?: string;
}) {
	const newAgent = await createAgent({
		fid,
		creatorFid,
		status,
		styleProfilePrompt,
		personality,
		tone,
		movieCharacter,
		username,
		displayName,
		avatarUrl,
		address: custodyAddress,
		mnemonic,
	});
	console.log(
		`[agent.service|${new Date().toISOString()}]: created new agent for fid ${fid} with status ${status}`,
	);

	return newAgent;
}

async function updateOrCreateAgent(
	fid: number,
	status: AgentStatus,
	styleProfilePrompt: string,
) {
	// Check if agent already exists
	const existingAgent = await getAgentByFid(fid);

	if (existingAgent) {
		// Update existing agent
		const updatedAgent = await updateAgent(existingAgent.id, {
			status,
			styleProfilePrompt,
		});
		console.log(
			`[agent.service|${new Date().toISOString()}]: updated existing agent for fid ${fid} with status ${status}`,
		);
		return updatedAgent;
	}
	// Create new agent
	const newAgent = await createAgent({
		fid: fid,
		creatorFid: fid,
		status,
		styleProfilePrompt,
	});
	console.log(
		`[agent.service|${new Date().toISOString()}]: created new agent for fid ${fid} with status ${status}`,
	);
	return newAgent;
}
