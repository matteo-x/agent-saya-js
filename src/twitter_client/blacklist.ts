import { ICacheManager } from "@elizaos/core";

export async function getTopicBlacklist(cacheManager: ICacheManager) {
	const cache = await cacheManager.get<string[]>("topic_black_list");
	return cache ?? [];
}

export async function getUserBlacklist(cacheManager: ICacheManager) {
	const cache = await cacheManager.get<string[]>("user_black_list");
	return cache ?? [];
}
