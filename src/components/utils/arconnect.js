import { ArConnect } from "arweavekit/auth";

export default {
	async connect() {
		try {
			await ArConnect.connect({
				permissions: [
					"ACCESS_ADDRESS",
					"ACCESS_PUBLIC_KEY",
					"ACCESS_ALL_ADDRESSES",
					"SIGN_TRANSACTION",
					"ACCESS_ARWEAVE_CONFIG",
					"SIGNATURE",
				],
			});

			return { contractId: await ArConnect.getActiveAddress() };
		} catch (err) {
			console.error(`Unable to connect to ArConnect:  ${err}`);
		}
	},
	async disconnect() {
		try {
			await ArConnect.disconnect();
		} catch (err) {
			console.error(err);
		}
	},
};