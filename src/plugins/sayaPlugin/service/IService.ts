export interface IService {
	// get information about balance, history, and portfolios from Saya
	getInformation(): Promise<EscrowInfo>;

	// commit recommendation to Saya
	recommend(params: {
		handle: string;
		address: string;
		type: string;
	}): Promise<boolean>;
}

// portfolio information
export interface Portfolio {
	tokenName: string;
	amount: string;
	price: string;
}

// transaction information
export interface Transaction {
	isBuy: boolean;
	date: string;
	tokenName: string;
	amount: string;
	price: string;
}

// escrow information
export interface EscrowInfo {
	address: string;
	balance: string;
	portfolios: Portfolio[];
	roi: string;
	txHistory: Transaction[];
}
