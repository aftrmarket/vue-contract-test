<template>
    <div class="m-4">
        <div class="flex flex-row gap-2">
            <input v-model="network" value="mainnet" type="radio" name="radio-2" class="radio radio-primary" checked /> <span class="label-text">Mainnet</span> 
            <input v-model="network" value="testnet" type="radio" name="radio-2" class="radio radio-primary" /> <span class="label-text">Testnet</span>
            <input v-model="network" value="local" type="radio" name="radio-2" class="radio radio-primary" /> <span class="label-text">Local</span>
        </div>
        <div class="flex flex-row">
            <div class="pr-2"><button @click="login('arconnect')" class="btn mt-2" :disabled="loggedIn">Login With ArConnect</button></div>
            <div class="pr-2"><button @click="login('othent')" class="btn mt-2" :disabled="loggedIn">Login With Othent</button></div>
            <div v-if="loggedIn"><button @click="logout" class="btn mt-2">Logout</button></div>
        </div>
        <div v-if="loggedIn">
            <div>
                Wallet ID: {{ walletAddress }} <br/>
                Wallet Balance: {{ walletBalance / 1000000 }} <br/>
                <span v-if="walletBalance == 0">Ask the AFTR team for some money!</span><br/>
                <span v-if="teamId !== ''">Team: {{ teamId }}</span><br/>
                <span v-if="playerId !== ''">Player: {{ playerId }}</span>
            </div>
            <div class="pt-4">
                Teams <br/>
                <div v-if="teams.length > 0" class="flex flex-row">
                    <select v-model="teamId" @change="teamSelected" class="select select-bordered w-full max-w-xs">
                        <option disabled selected=true>Select Team</option>
                        <option v-for="team of teams">{{ team }}</option>
                    </select>
                    <button @click="clearTeamSelect" :disabled="disableClear" class="btn btn-square ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div v-else>
                    <div>In order to buy players, you must create a team.</div>
                </div>
                <div v-if="false" class="pt-2">
                    <input v-model="teamName" type="text" placeholder="Team Name" class="input input-bordered w-full max-w-xs" />
                    <div class="pr-2"><button :disabled="disableCreateTeam" class="btn mt-2">Create Team</button></div>
                </div>
            </div>
            <div v-if="teamId !== ''" class="pt-4">
                Players <br/>
                <select v-if="players.length > 0" v-model="playerId" class="select select-bordered w-full max-w-xs">
                    <option disabled selected>Select Player</option>
                    <option v-for="player of players" :key="player.playerId" :value="player.playerId">{{ player.playerName }} - ${{ player.price / 1000000 }}</option>
                </select>
            </div>
            <div v-if="playerId !== '' && walletBalance > 0">
                <div class="pr-2"><button @click="buyPlayer" class="btn mt-2" :disabled="loading">Buy Player</button></div>
            </div>
            <div v-if="walletBalance == 0">
                You need money in your wallet to purchase a player!
            </div>
        </div>

        <span v-if="loading" class="loading loading-dots loading-lg"></span>

        <div v-if="buyProcess">
            <ul class="timeline timeline-vertical font-mono">
                <li v-if="step1">
                    <div class="timeline-start">Step 1: Allow on Work Contract</div>
                    <div class="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                    </div>
                    <div class="timeline-end timeline-box">{{ showTx(txId1, 1) }}</div>
                    <hr/>
                </li>
                <li v-if="step2">
                    <hr/>
                    <div class="timeline-start">Step 2: Deposit on Player Contract</div>
                    <div class="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                    </div>
                    <div class="timeline-end timeline-box">{{ showTx(txId2, 2) }}</div>
                    <hr/>
                </li>
                <li v-if="step3">
                    <hr/>
                    <div class="timeline-start">Step 3: Deposit on Team Contract</div>
                    <div class="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                    </div>
                    <div class="timeline-end timeline-box">{{ showTx(txId3, 3) }}</div>
                </li>
            </ul>
        </div>

        <!--
        <div class="grid grid-cols-2 gap-4 p-4 border">
            <div class="pt-4 w-full">
                <p class="font-sans font-lg text-aftrBlue">AFTR Contract Snippet</p><br/>
                <vue-json-pretty :path="'res'" :data="contractState" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
            </div>
            <div class="pt-4 w-full">
                <p class="font-sans font-lg text-aftrBlue">PST</p><br/>
                <vue-json-pretty :path="'res'" :data="contractStatePst" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
            </div>
        </div>
        -->
    </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { warpRead } from "./utils/warpUtils.js";
import othent from "./utils/othent";
import arconnect from "./utils/arconnect";
import * as arweaveWallet from "@othent/kms";
import { WarpFactory, defaultCacheOptions } from "warp-contracts";
import { DeployPlugin } from "warp-contracts-plugin-deploy";
import { InjectedArweaveSigner } from "warp-contracts-plugin-signature";

export default {
    components: { VueJsonPretty },
    data() {
        return {
            TEAM_REG_CONTRACT: "niuXC2oVrT6qlAcPjxaf_vKmfM5itF2dDCZs4SEOE7o",
            PLAYER_REG_CONTRACT: "VIDlP72LABHhLGS_RiB7Sw8DhpQr8LeRHLp6d1MLl2I",
            GAME_CURRENCY_ID: "LKabBhoeJwwEJPko1soDg8q06K7wIC7FRA1kS049cpU",
            TEAM_CONTRACT_SOURCE: "XhgQPOHE4vIecrOUnt_FQzhSwnt9boTqYcn-qfj-DPk",
            API_ENDPOINT: "https://85hq5an6je.execute-api.us-east-1.amazonaws.com/",
            loading: false,
            loggedIn: false,
            network: "mainnet",
            provider: "",
            teamId: "", 
            teamName: "",
            myTeam: {},
            walletAddress: "",
            walletBalance: 0,
            teamRegistry: {},
            playerRegistry: {},
            players: [],
            playerId: "",
            workContract: {},
            teams: [],
            user: {},
            txId1: "",
            txId2: "",
            txId3: "",
            step1: false,
            step2: false,
            step3: false,
            buyError: 0,
            buyProcess: false,
        };
    },
    computed: {
        disableCreateTeam() {
            let disable = false;
            if (this.teamId !== '' || this.teamName === '') {
                disable = true;
            }
            return disable;
        },
        disableClear() {
            let disable = false;
            if (this.teamId === "") {
                disable = true;
            }
            return disable;
        },
        showReject() {
            let result = false;
            if (!this.loading && this.buyProcess && this.txId2 !== "" && this.txId3 === "") {
                result = true;
            }
            return true;
        },
    },
    methods: {
        showTx(txId, step) {
            let tx = "";
            if (txId !== "") {
                tx = txId;
            } else if ((this.buyError === 1 && step === 1) || (this.buyError === 2 && step === 2) || (this.buyError === 3 && step === 3)) {
                tx = "Failed";
            }
            return tx;
        },
        async login(provider = "arconnect") {
            this.loading = true;
			try {
				switch (provider) {
					case "othent":
						this.user = await othent.login();
						break;
					case "arconnect":
						this.user = await arconnect.connect();
						break;
					default:
						throw new Error("Invalid provider: " + provider);
				}
				this.provider = provider;
                this.loggedIn = true;
			} catch (e) {
                this.loggedIn = false;
				console.error(e);
                this.loading = false;
                return;
			}
            this.walletAddress = this.user.contractId;
            await this.getTeams();
            await this.getWorkBalances();
            await this.getPlayers();
            this.loading = false;
		},
		async logout() {
			if (this.loggedIn) {
				if (this.provider == "othent") {
					await othent.logout();
				} else if (this.provider == "arconnect") {
					await arconnect.disconnect();
				}
				this.user = {},
                this.teams = [],
                this.walletAddress = "";
                this.walletBalance = 0;
                this.teamId = "";
                this.myTeam = {};
                this.teamName = "";
                this.provider = "";
                this.playerId = "";
                this.txId1 = "";
                this.txId2 = "";
                this.txId3 = "";
                this.step1 = false;
                this.step2 = false;
                this.step3 = false;
                this.buyProcess = false;
                this.buyError = 0;
                this.loggedIn = false;
				console.info("Logged out successfully");
			} else {
				console.error("User must be logged in to log out");
			}
		},
        async getTeams() {
            this.teamRegistry = await warpRead(this.TEAM_REG_CONTRACT, true, "PROD");
            if (this.teamRegistry.owners.hasOwnProperty(this.walletAddress)) {
                this.teams = this.teamRegistry.owners[this.walletAddress];
            } else {
                this.teams = [];
            }
        },
        async readTeam() {
            this.myTeam = await warpRead(this.teamId, true, "PROD");
        },
        async getWorkBalances() {
            this.workContract = await warpRead(this.GAME_CURRENCY_ID, true, "PROD");
            if (this.workContract.balances.hasOwnProperty(this.walletAddress)) {
                this.walletBalance = this.workContract.balances[this.walletAddress];
            }
        },
        async getPlayers() {
            this.playerRegistry = await warpRead(this.PLAYER_REG_CONTRACT, true, "PROD");
            for (const player of this.playerRegistry.register) {
                this.players.push({
                    playerId: player.id,
                    playerName: player.meta.name,
                    price: player.price
                });
            }
        },
        teamSelected() {
            this.teamName = this.teamRegistry.register[this.teamId].name;
        },
        clearTeamSelect() {
            this.teamId = "";
            this.teamName = "";
        },
        async buyPlayer() {
            this.loading = true;
            this.buyProcess = true;
            this.buyError = 0;

            this.txId1 = "";
            this.txId2 = "";
            this.txId3 = "";

            await this.readTeam();

            const index = this.myTeam.tokens.findIndex(token => token.tokenId === this.playerId);
            if (index >= 0) {
                alert("You already own this player.  Please select another one.");
                this.loading = false;
                return;
            }

            this.step1 = true;
            console.log("Step 1");
			console.log("*** ALLOW");
            const selectedPlayer = this.players.find(player => player.playerId === this.playerId); 
            const purchasePrice = selectedPlayer.price;
            console.log(`Price: ${purchasePrice}`);
            
			let input = {
				function: "allow",
				target: this.playerId,
				qty: Number(purchasePrice),
			};

			
			try {
				this.txId1 = await this.warpInteractWrite(this.GAME_CURRENCY_ID, input);
			} catch (e) {
				console.log(`Interaction 1 (allow): ${e}`);
                this.buyError = 1;
                this.loading = false;
                return;
			}
			console.log("*** ALLOW: " + this.txId1);

            this.step2 = true;
			console.log("Step 2");
			console.log("*** BUY");
			input = {
				function: "deposit",
				tokenId: this.GAME_CURRENCY_ID,
				qty: Number(purchasePrice),
				txID: this.txId1,
				target: this.teamId,
			};

			try {
				this.txId2 = await this.warpInteractWrite(this.playerId, input);
			} catch (e) {
				console.log(`Interaction 2 (buy): ${e}`);
                this.buyError = 2;
                this.loading = false;
				return;
			}
			console.log("*** BUY: " + this.txId2);

            this.step3 = true;
			console.log("Step 3");
			console.log("*** DEPOSIT");
			input = {
				function: "deposit",
				tokenId: this.playerId,
				qty: 1,
				txID: this.txId2,
			};
			try {
				this.txId3 = await this.warpInteractWrite(this.teamId, input);
			} catch (e) {
				console.log(`Interaction 3 (deposit): ${e}`);
                this.buyError = 3;
                this.loading = false;
				return;
			}
			console.log("*** DEPOSIT: " + this.txId3);
            console.log("SUCCESSFUL!");

            this.loading = false;
        },
        async warpInteractWrite(contractId, input) {
            const warp = WarpFactory.forMainnet({ ...defaultCacheOptions }).use(new DeployPlugin());
            // const warp = WarpFactory.forMainnet({ ...defaultCacheOptions, inMemory: true }).use(new DeployPlugin());
            // const warp = WarpFactory.forMainnet({ ...defaultCacheOptions }).use(new DeployPlugin());

            let signer;
            try {
                if (this.provider == "othent") {
                    signer = new InjectedArweaveSigner(arweaveWallet);
                    signer.getAddress = arweaveWallet.getActiveKey;
                } else if (this.provider == "arconnect") {
                    signer = new InjectedArweaveSigner(window.arweaveWallet);
                    signer.getAddress = window.arweaveWallet.getActiveAddress;
                }
                await signer.setPublicKey();
                const contract = warp
                    .contract(contractId)
                    .setEvaluationOptions({
                        internalWrites: true,
                        remoteStateSyncEnabled: true,
                        // remoteStateSyncSource: "https://dre-3.warp.cc/contract",
                        // remoteStateSyncSource: process.env.DRE_ENDPOINT,
                    })
                    .connect(signer);

                const { originalTxId } = await contract.writeInteraction(input);
                await warp.close();
                return originalTxId;
            } catch (err) {
                console.log(err);
                throw err;
            }
        },
        async warpCreateFromSourceTx(srcTxId, initState) {
            const warp = WarpFactory.forMainnet({ ...defaultCacheOptions }).use(new DeployPlugin());

            let signer;
            try {
                if (this.provider == "othent") {
                    signer = new InjectedArweaveSigner(arweaveWallet);
                } else if (this.provider == "arconnect") {
                    signer = new InjectedArweaveSigner(window.arweaveWallet);
                }
                await signer.setPublicKey();

                const { contractTxId } = await warp.deployFromSourceTx({
                    wallet: signer,
                    initState: JSON.stringify(initState),
                    srcTxId,
                });
                await warp.close();
                return contractTxId;
            } catch (err) {
                console.log(err);
                throw err;
            }
        }
    },
}
</script>