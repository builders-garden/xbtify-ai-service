import {
	type Address,
	createPublicClient,
	createWalletClient,
	http,
} from "viem";
import { english, generateMnemonic, mnemonicToAccount } from "viem/accounts";
import { optimism } from "viem/chains";
import { ID_REGISTRY_ABI, ID_REGISTRY_ADDRESS } from "./constants.js";
import {
	checkFnameAvailability,
	fetchFreshFid,
	registerFarcasterAccount,
} from "./neynar.js";

type CreateFarcasterAccountParams = {
	fname: string;
	displayName?: string;
	bio?: string;
	pfpUrl?: string;
	url?: string;
};

type CreateFarcasterAccountResult = {
	fid: number;
	mnemonic: string;
	custodyAddress: Address;
	fname: string;
	signerUuid: string;
};

/**
 * Create a new Farcaster account with a generated wallet
 * This follows the Neynar guide for wallet integration
 */
export async function createFarcasterAccount(
	params: CreateFarcasterAccountParams,
): Promise<CreateFarcasterAccountResult> {
	// Step 1: Generate a new private key and wallet
	const mnemonic = generateMnemonic(english);
	// const privateKey = generatePrivateKey();
	// const account = privateKeyToAccount(privateKey);
	const account = mnemonicToAccount(mnemonic);
	const custodyAddress = account.address;

	console.log("Generated wallet address:", custodyAddress);

	// Step 2: Create wallet client and public client for Optimism
	const walletClient = createWalletClient({
		account,
		chain: optimism,
		transport: http(),
	});

	const publicClient = createPublicClient({
		chain: optimism,
		transport: http(),
	});

	// Step 3: Fetch a fresh FID from Neynar
	const fid = await fetchFreshFid();
	console.log("FID fetched:", fid);

	// Step 4: Check fname availability
	const isAvailable = await checkFnameAvailability(params.fname);

	if (!isAvailable) {
		throw new Error(`Username "${params.fname}" is not available`);
	}

	console.log("Fname is available:", params.fname);

	// Step 5: Get nonce from ID Registry contract
	const nonce = await publicClient.readContract({
		address: ID_REGISTRY_ADDRESS,
		abi: ID_REGISTRY_ABI,
		functionName: "nonces",
		args: [custodyAddress],
	});

	console.log("Nonce from contract:", nonce);

	// Step 6: Generate EIP-712 signature
	const now = Math.floor(Date.now() / 1000);
	const deadline = BigInt(now + 3600); // 1 hour from now

	const domain = {
		name: "Farcaster IdRegistry",
		version: "1",
		chainId: 10,
		verifyingContract: ID_REGISTRY_ADDRESS,
	} as const;

	const types = {
		Transfer: [
			{ name: "fid", type: "uint256" },
			{ name: "to", type: "address" },
			{ name: "nonce", type: "uint256" },
			{ name: "deadline", type: "uint256" },
		],
	} as const;

	const message = {
		fid: BigInt(fid),
		to: custodyAddress,
		nonce: BigInt(nonce),
		deadline,
	};

	const signature = await walletClient.signTypedData({
		account: account,
		domain,
		types,
		primaryType: "Transfer",
		message,
	});

	console.log("Signature generated");

	// Step 7: Register the account with Neynar
	const metadata = {
		bio: params.bio || "",
		pfp_url: params.pfpUrl || "",
		url: params.url || "",
		display_name: params.displayName || params.fname,
	};

	const registerResponse = await registerFarcasterAccount({
		fid,
		signature,
		custodyAddress,
		deadline: Number(deadline),
		fname: params.fname,
		metadata,
	});

	console.log("Account registration response:", registerResponse);

	return {
		fid,
		mnemonic,
		custodyAddress,
		fname: params.fname,
		signerUuid: registerResponse.signer.signer_uuid,
	};
}
