import { connect, disconnect, getActiveKey } from "@othent/kms";

export default {
	async login() {
		try {
			const { name, email, picture } = await connect();
			const contractId = await getActiveKey();
			return { name, picture, email, contractId };
		} catch (e) {
			console.log(e);
			throw e;
		}
	},
	async logout() {
		try {
			await disconnect();
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
};