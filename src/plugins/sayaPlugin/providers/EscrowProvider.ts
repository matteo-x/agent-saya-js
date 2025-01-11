import {
	composeContext,
	elizaLogger,
	IAgentRuntime,
	Memory,
	Provider,
	State,
} from "@elizaos/core";
import { defaultService } from "../service/DefaultService.ts";

export const EscrowProvider: Provider = {
	get: async function (
		_runtime: IAgentRuntime,
		_message: Memory,
		_state?: State
	): Promise<any> {
		elizaLogger.debug("[EscrowProvider] start getting information");

		const escrowInfo = await defaultService.getInformation();

		const escrowInfoFormat = {
			...escrowInfo,
			portfoliosStr: escrowInfo.portfolios
				.map(
					(item) =>
						`The token's name is ${item.tokenName}, the quantity held is ${item.amount}, and the average purchase price is ${item.price} `
				)
				.join(", "),
			txHistoryStr: escrowInfo.txHistory
				.map(
					(item) =>
						`At ${item.date}, ${item.amount} tokens of ${item.tokenName} were ${
							item.isBuy ? "bought" : "sold"
						}  at a price of ${item.price}`
				)
				.join(", "),
		};

		const escrowTemplate =
			"The escrow address is {{address}}, the current balance is {{balance}} SOL. \n" +
			"The current roi is: {{roi}}. \n" +
			"The portfolios are: {{portfoliosStr}}. \n" +
			"The recent transactions are: {{txHistoryStr}}";

		const result = composeContext({
			state: escrowInfoFormat as any as State,
			template: escrowTemplate,
		});

		elizaLogger.debug("[EscrowProvider] end getting information");

		return Promise.resolve(result);
	},
};
