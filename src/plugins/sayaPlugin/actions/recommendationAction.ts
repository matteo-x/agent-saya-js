import {
	Action,
	composeContext,
	elizaLogger,
	generateObject,
	generateObjectDeprecated,
	HandlerCallback,
	IAgentRuntime,
	Memory,
	ModelClass,
	State,
} from "@elizaos/core";
import { z } from "zod";
import { defaultService } from "../service/DefaultService.ts";

const recommendTemplate = `
Given the recent messages and wallet information below:

{{recentMessages}}

Task: Extract recommendation details from the user conversation and return a JSON object.

Based on the value of recommend_type, extract the relevant fields and ensure the format is correct. The output should include the following:

recommend_type: Required, and must be one of the following types: kol, smart, token.
If recommend_type is kol, return the corresponding Twitter username as username.
If recommend_type is smart, return the corresponding wallet address as wallet_address.
If recommend_type is token, return both tokenName and tokenAddress(CA).
If no recommendation information can be extracted, return an empty JSON object {}.

Note: Only return the details of the last matched recommendation.

Example Input:
User conversations:

"I think @elonmusk is definitely worth following!"
"This wallet address 0x123abc456def789ghi is very active, you should check it out."
"The new MEME token $DOGE is going viral, and its contract address is 0xdoge123abc456def."
Example Output:

{"recommend_type": "kol", "username": "elonmusk"}
{"recommend_type": "smart", "wallet_address": "0x123abc456def789ghi"}
{"recommend_type": "token", "tokenName": "DOGE", "tokenAddress": "0xdoge123abc456def"}
Start extracting recommendation details from the user conversation.
`;

const recommendationSchema = z.union([
	z.object({
		recommend_type: z.literal("kol"),
		username: z.string(),
	}),
	z.object({
		recommend_type: z.literal("smart"),
		wallet_address: z.string(),
	}),
	z.object({
		recommend_type: z.literal("token"),
		tokenName: z.string(),
		tokenAddress: z.string(),
	}),
]);

export const recommendationAction: Action = {
	description:
		"Determine whether it contains any praise, affirmation, or endorsement of a particular entity (e.g., a KOL, smart money, or a token), and extract details from the user conversation. ",
	validate: (input) => {
		return Promise.resolve(true);
	},
	handler: handler,
	similes: ["RECOMMENDATION"],
	examples: [],
	name: "RECOMMENDATION_INFO",
};

async function handler(
	runtime: IAgentRuntime,
	message: Memory,
	_state?: State,
	options?: {
		[key: string]: unknown;
	},
	callback?: HandlerCallback
) {
	elizaLogger.log("[recommendationAction] handler start");

	const context = await makeContext(runtime, message, _state);

	const content = await generateObject({
		runtime,
		context,
		modelClass: ModelClass.LARGE,
		schema: recommendationSchema,
	}).catch((e) => {
		console.error("[recommendationAction] generateObject error = ", e);
	});

	elizaLogger.log(
		"[recommendationAction] response content = ",
		content && content.object
	);

	const result = recommendationSchema.safeParse(content ? content.object : {});

	if (!result.success) {
		elizaLogger.error("[recommendationAction] validation error");
		return;
	}

	const account = await runtime.databaseAdapter.getAccountById(message.userId);
	elizaLogger.log(
		"[recommendationAction] find account = ",
		account.username,
		account.name
	);

	await commitRecommendation(account.username, result.data).catch((e) => {
		elizaLogger.error(
			"[recommendationAction] commit recommendation error = ",
			e
		);
	});

	console.log("[recommendationAction] handler end");
}

async function makeContext(
	runtime: IAgentRuntime,
	message: Memory,
	_state?: State
) {
	const state = !_state
		? ((await runtime.composeState(message)) as State)
		: await runtime.updateRecentMessageState(_state);

	const context = composeContext({
		state,
		template: recommendTemplate,
	});

	return context;
}

async function commitRecommendation(
	username: string,
	content: z.infer<typeof recommendationSchema>
) {
	const param: any = {
		handle: username,
		type: content.recommend_type,
	};

	if (content.recommend_type === "kol") {
		param.address = content.username;
	} else if (content.recommend_type === "smart") {
		param.address = content.wallet_address;
	} else if (content.recommend_type === "token") {
		param.address = content.tokenAddress;
	}

	defaultService.recommend(param);
}
