<template>
    <div class="m-4">
        <div class="flex flex-row gap-2">
            <input v-model="network" value="PROD" type="radio" name="radio-2" class="radio radio-primary" @change="networkSelect"/> <span class="label-text">Mainnet</span> 
            <input v-model="network" value="TEST" type="radio" name="radio-2" class="radio radio-primary" @change="networkSelect" /> <span class="label-text">Testnet</span>
            <input v-model="network" value="DEV" type="radio" name="radio-2" class="radio radio-primary" @change="networkSelect" /> <span class="label-text">Local</span>
        </div>
        <div>Active Wallet: {{ toAr }}</div>
        <div>
            <input v-model="repoName" type="text" placeholder="Repo Name" class="input input-bordered w-96" />
            <input v-model="repoTicker" type="text" placeholder="Ticker" class="input input-bordered w-48" />
        </div>
        <div>
            <div>Custom Tags:</div>
            <textarea v-model="tagsString" class="textarea textarea-bordered w-96" placeholder="Enter any custom tags in the form:  [ { name: '<NAME>', value: ['<VALUE>'] } ]"></textarea>
        </div>
        <div v-if="tagValues.length > 0">
            <div v-for="tagValue in tagValues">Name: {{ tagValue.name }} | Value: {{ tagValue.value }}</div>
        </div>
        <div><button @click="buttonPress" class="btn mt-2">Create Contract</button></div>
        <div>Contract ID: {{ contractId }}</div>
        <div>Contract Source ID: {{ contractSrcId }}</div>
        <div>New Source ID: {{ newSrcId }}</div>
    </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { arweaveInit, warpCreateFromTx } from "./utils/warpUtils.js";
import Transaction from 'arweave/node/lib/transaction';

import { createRepo, deposit } from "aftr-js";

const queryProtocol = "AFTR-PLAY";
// Play Counter Token ID:  EtB_GmTlI4lYz9t9hIFaDfdFotM8mK4eqM8QvPCSUOY

export default {
    components: { VueJsonPretty },
    data() {
        return {
            aftrContractSrcs: import.meta.env.VITE_AFTR_CONTRACT_SOURCES,
            network: "",
            contractId: "",
            contractState: {},
            contractSrcId: "",
            newSrcId: "",
            routeProtocol: "http",
            routeHost: "localhost",
            routePort: "1984",
            walletBalance: 0,
            walletAddr: "",
            errorMsg: "",
            tags: [],
            validities: {},
            repoName: "",
            repoTicker: "",
            tagsString: "",
            tagValues: [],
        };
    },
    computed: {
        toAr() {
            return this.walletBalance/1000000000000;
        }
    },
    watch: {
        network() {
            if (this.network === "DEV") {
                this.routeProtocol = "http";
                this.routePort = "1984";
                this.routeHost = "localhost";
            } else if (this.network === "TEST") {
                this.routeProtocol = "https";
                this.routePort = "443";
                this.routeHost = "arweave.net";
            } else if (this.network === "PROD") {
                this.routeProtocol = "https";
                this.routePort = "443";
                this.routeHost = "arweave.net";
            } else {
                alert("No route can be determined");
            }
        },
    },

/*** 
 * 1. Set Contract ID to equal existing contract and read contract
 * 2. Create new contract
 * 3. Add new source to what is set to contractId
 */
    methods: {
        async networkSelect() {
            try {
                this.walletAddr = await window.arweaveWallet.getActiveAddress();
            } catch(e) {
                console.log(e);
                const promiseResult = await window.arweaveWallet.connect([
                    "ACCESS_ADDRESS",
                    "ACCESS_ALL_ADDRESSES",
                    "SIGN_TRANSACTION",
                    "ACCESS_ARWEAVE_CONFIG",
                ]);
                this.walletAddr = await window.arweaveWallet.getActiveAddress();
            }
            await this.updateWalletBalance();
        },
        reset() {
            this.contractId = "";
            this.contractState = {};
            this.contractSrcId = "";
            this.newSrcId = "";
            this.errorMsg = "";
            this.repoName = "";
            this.repoTicker = "";
            this.tagsString = "";
            this.tagValues = [];
        },

        async buttonPress() {
            if (this.repoName == "" || this.repoTicker == "") {
                alert("Please enter a Name and Ticker.");
                return;
            }
            // Are any custom tags in the correct format?
            let customTags = [];
            if (this.tagsString !== "") {
                customTags = JSON.parse(this.tagsString);
                this.tagValues = customTags;
            }
            
            let repo = {
                name: this.repoName,
                ticker: this.repoTicker
            };
            let response = new Object();
            if (customTags.length === 0) {
                response = await createRepo(repo, "use_wallet", undefined, this.network);
            } else {
                response = await createRepo(repo, "use_wallet", undefined, customTags, this.network);
                //response = await warpCreateFromTx(repo, "46NSN651ClSYi241BtcarUY15wBL7OJgJsDEALE9Dzo", customTags, true, this.network);
            }
            if (response.status === "success") {
                alert("NEW REPO: " + response.data);
            } else {
                alert("ERROR: " + response.message);
            }
        },
        async updateWalletBalance() {
            const arweave = arweaveInit(this.network);
            this.walletBalance = await arweave.wallets.getBalance(this.walletAddr);
        },
        async getContractSourceId(txID) {
            let route = "";
            let response = {};
            if (this.network === "DEV") {
                route = this.routeProtocol + "://" + this.routeHost + ":" + this.routePort + "/tx/" + txID;
                response = await fetch(route).then(res=> res.json());
                this.tags = this.interactionTagsParser(response);
            } else {
                route = `https://gateway.redstone.finance/gateway/contract?txId=${txID}${this.network === "TEST" ? "&testnet=true" : ""}`;
                response = await fetch(route);
                if (!response.ok) {
                    alert("Could not fetch contract.");
                    return;
                }
                const data = await response.json();
                return data.srcTxId;
            }

            for (let i = 0; i < this.tags.length; i++) {
                if (this.tags[i].key === "Contract-Src") {
                    return this.tags[i].value;
                }
            }
        },
        interactionTagsParser(tx) {
            const contractTx = new Transaction(tx);
            let tags = [];
            contractTx.get('tags').forEach((tag) => {
                let key = tag.get('name', { decode: true, string: true });
                let value = tag.get('value', { decode: true, string: true });
                tags.push({ key, value });
            });
            return tags;
        },
        async returnContractSrc(contractId) {
            const arweave = arweaveInit(this.network);
            let tx = await arweave.transactions.get(contractId);
            let contractSrcId = "";

            tx.get('tags').every(tag => {
                let key = tag.get('name', {decode: true, string: true});
                let value = tag.get('value', {decode: true, string: true});
                if (key === "Contract-Src") {
                    contractSrcId = value;
                    return false;
                }
                return true;
            });
            return contractSrcId;
        },
    },
}
</script>