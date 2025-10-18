import type { Agent } from "../lib/database/db.schema.js";
import { createAgent } from "../lib/database/queries/agent.query.js";
import {
	createCasts,
	deleteAllCastsByFid,
} from "../lib/database/queries/cast.query.js";
import {
	createReplies,
	deleteAllRepliesByFid,
} from "../lib/database/queries/reply.query.js";
import {
	fetchUserCasts,
	fetchUserRepliesWithParentCast,
} from "../lib/neynar.js";
import {
	extractCastsDataForDb,
	extractRepliesDataForDb,
	filterCastsByLength,
	filterRepliesByLength,
} from "../lib/utils/agent.js";
import { AgentStatus } from "../types/enums.js";

const minLength = 30;

export const initAgent = async ({ fid }: { fid: number }) => {
	try {
		// doing something here
		console.log("[agent.service]: initAgent called");

		const { count } = await fetchAndStoreFarcasterCasts(fid);

		await storeNewAgentInDb(fid, AgentStatus.INITIALIZING);

		return {
			fid,
			importedCasts: count,
		};
	} catch (error) {
		console.error("[agent.service]:", error);
		throw error;
	}
};

export const reinitializeAgent = async ({ fid, deleteCasts, deleteReplies }: { fid: number, deleteCasts: boolean, deleteReplies: boolean }) => {
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
    if (deleteCasts) {
      deletedCastsCount = await deleteAllCastsByFid(fid);
      console.log(
        `[agent.service|${new Date().toISOString()}]: deleted ${deletedCastsCount} existing casts for fid ${fid}`,
      );
      // step 2: fetch and store fresh casts
		  const { count } = await fetchAndStoreFarcasterCasts(fid);
      importedCastsCount = count;
    }

    if (deleteReplies) {
      deletedRepliesCount = await deleteAllRepliesByFid(fid);
      console.log(
        `[agent.service|${new Date().toISOString()}]: deleted ${deletedRepliesCount} existing replies for fid ${fid}`,
      );
      // step 3: fetch and store fresh replies
    const { count } = await fetchAndStoreFarcasterReplies(fid);
    importedRepliesCount = count;
    }

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

async function storeNewAgentInDb(fid: number, status: AgentStatus) {
	const newAgent = await createAgent({
		fid: 1,
		creatorFid: fid,
		status,
	});
	console.log(
		`[agent.service|${new Date().toISOString()}]: created new agent for fid ${fid} with status ${status}`,
	);

	return newAgent;
}
