import { ICacheManager } from "@elizaos/core";

export async function getTopicBlacklist(cacheManager: ICacheManager) {
	const maliciousTopics = [
		"C95ZLzTAiJSWPtWL9eZwmF4p52CcnzF2tQnqTC7qpump",
		"9GDh3p2a7MYJiJM8t2a5cDXbWkgkxibzXNq99qNepump",
	];
	const cache = await cacheManager.get<string[]>("topic_black_list");
	return (cache ?? []).concat(maliciousTopics);
}

export async function getUserBlacklist(cacheManager: ICacheManager) {
	const cache = await cacheManager.get<string[]>("user_black_list");
	return cache ?? [];
}
