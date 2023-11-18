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
                <select v-if="teams.length > 0" v-model="teamId" class="select select-bordered w-full max-w-xs">
                    <option disabled selected=true>Select Team</option>
                    <option v-for="team of teams">{{ team }}</option>
                </select>
                <div v-else>
                    <div>In order to buy players, you must create a team.</div>
                    <div class="pr-2"><button @click="createTeam" class="btn mt-2">Create Team</button></div>
                </div>
            </div>
            <div v-if="teamId !== ''">
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
import { warpCreateFromTx, warpRead } from "./utils/warpUtils.js";
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
        };
    },
    computed: {
        toAr() {
            return this.walletBalance/1000000000000;
        }
    },
    methods: {
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
                this.provider = "";
                this.playerId = "";
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
        async buyPlayer() {
            this.loading = true;

            await this.readTeam();

            const index = this.myTeam.tokens.findIndex(token => token.tokenId === this.playerId);
            if (index >= 0) {
                alert("You already own this player.  Please select another one.");
                this.loading = false;
                return;
            }

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

			let txId = "";
			try {
				txId = await this.warpInteractWrite(this.GAME_CURRENCY_ID, input);
			} catch (e) {
				console.log(`Interaction 1 (allow): ${e}`);
                this.loading = false;
                return;
			}
			console.log("*** ALLOW: " + txId);

			console.log("Step 2");
			console.log("*** BUY");
			input = {
				function: "deposit",
				tokenId: this.GAME_CURRENCY_ID,
				qty: Number(purchasePrice),
				txID: txId,
				target: this.teamId,
			};

			try {
				txId = await this.warpInteractWrite(this.playerId, input);
			} catch (e) {
				console.log(`Interaction 2 (buy): ${e}`);
                this.loading = false;
				return;
			}
			console.log("*** BUY: " + txId);

			console.log("Step 3");
			console.log("*** DEPOSIT");
			input = {
				function: "deposit",
				tokenId: this.playerId,
				qty: 1,
				txID: txId,
			};
			try {
				txId = await this.warpInteractWrite(this.teamId, input);
			} catch (e) {
				console.log(`Interaction 3 (deposit): ${e}`);
                this.loading = false;
				return;
			}
			console.log("*** DEPOSIT: " + txId);
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
        }
    },
}
</script>