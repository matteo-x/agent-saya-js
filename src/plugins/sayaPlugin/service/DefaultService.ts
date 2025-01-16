import { EscrowInfo, IService } from "./IService";

class SayaService implements IService {
	host: string;

	constructor(host: string) {
		this.host = host;
	}

	async getInformation(): Promise<EscrowInfo> {
		const response = await fetch(`${this.host}/saya/asset`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		return Promise.resolve((response.json() as any).data as EscrowInfo);
	}

	async recommend(param: {
		handle: string;
		address: string;
		type: string;
	}): Promise<boolean> {
		const response = await fetch(`${this.host}/saya/rec`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(param),
		});

		return Promise.resolve(response.ok);
	}
}

class MockService implements IService {
	async getInformation(): Promise<EscrowInfo> {
		return Promise.resolve({
			address: "74SBV4zDXxTRgv1pEMoECskKBkZHc2yGPnc7GYVepump",
			balance: "10000",
			portfolios: [],
			roi: "1000%",
			txHistory: [],
		});
	}

	async recommend(_param: {
		handle: string;
		address: string;
		type: string;
	}): Promise<boolean> {
		console.log("[MockService] recommend = ", _param);
		return Promise.resolve(true);
	}
}

export const defaultService = !process.env.SAYA_HOST
	? new MockService()
	: new SayaService(process.env.SAYA_HOST);
