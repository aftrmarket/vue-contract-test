<template>
    <div class="m-4">
        <div class="flex flex-row gap-2">
            <input v-model="network" value="mainnet" type="radio" name="radio-2" class="radio radio-primary" checked /> <span class="label-text">Mainnet</span> 
            <input v-model="network" value="testnet" type="radio" name="radio-2" class="radio radio-primary" /> <span class="label-text">Testnet</span>
            <input v-model="network" value="local" type="radio" name="radio-2" class="radio radio-primary" /> <span class="label-text">Local</span>
        </div>
        <div><button @click="buttonPress1" class="btn mt-2">1. Create Contract</button></div>
        <div>Contract Source ID: {{ contractSrcId }}</div>
        <div>Evolve Source ID: {{ evolveSrcId }}</div>
        <div>Evolve: {{ evolve }}</div>
        <div>New Source ID: {{ newSrcId }}</div>
        <div><button @click="buttonPress2" class="btn mt-2">2. Add New Source</button></div>
        <div><button @click="buttonPress3" class="btn mt-2">3. Evolve</button></div>
        <div><button @click="buttonPress4" class="btn mt-2">4. Test Evolve</button></div>
        <div class="pt-4 w-full">
            <vue-json-pretty :path="'res'" :data="contractState" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
        </div>
    </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { arweaveInit, warpCreateContract, warpCreateFromTx, warpInit, warpRead, warpWrite, warpSaveNewSource, warpEvolve } from "./utils/warpUtils.js";
import Transaction from 'arweave/node/lib/transaction';
import evolveTestContractA from "./../files/evolveTestContractA.js?raw";
import evolveTestContractB from "./../files/evolveTestContractB.js?raw";
import sampleContractInitState from "./../files/sampleContractInitState.json?raw";
export default {
    components: { VueJsonPretty },
    data() {
        return {
            network: "local",
            contractId: "",
            contractState: {},
            contractSrcId: "",
            evolveSrcId: "",
            newSrcId: "",
            evolve: "",
            vehicleTemplate: {
                "name": "",
                "ticker": "",
                "balances": {},
                "tokens": [],
                "vault": {},
                "votes": [],
                "status": "started",
                "owner" : "",
                "ownership" : "single",
                "votingSystem" : "weighted",
                "claims": [],
                "claimable": [],
                "evolve": null,
                "settings": [
                    [ "quorum", 0.5 ],
                    [ "support", 0.5 ],
                    [ "voteLength", 2160 ],
                    [ "communityLogo", "" ]
                ]
            }
        };
    },
    computed: {

    },

/*** 
 * 1. Create and read new contract
 * 2. Add new source
 * 3. Evolve to new source
 * 4. Write an interaction to the contract to see if new source is being used and read the contract again 
 */
    methods: {
        async readContract() {
            if (this.contractId === "") {
                return;
            }
            const result = await warpRead(this.contractId);
            this.contractState = result;
            this.contractSrcId = await this.getContractSourceId(this.contractId);
        },

        async buttonPress1() {            
            // Try to get wallet, if fails, connect so user can assign permissions
            let wallet = {
                address: "",
            };
            try {
                wallet.address = await window.arweaveWallet.getActiveAddress();
            } catch(e) {
                console.log(e);
                const promiseResult = await window.arweaveWallet.connect([
                    "ACCESS_ADDRESS",
                    "ACCESS_ALL_ADDRESSES",
                    "SIGN_TRANSACTION",
                    "ACCESS_ARWEAVE_CONFIG",
                ]);
                wallet.address = await window.arweaveWallet.getActiveAddress();
            }

            if (this.network !== "local") {
                alert("Test app is currently only configured to run on an Arlocal instance.");
                return;
            }

            /*** WARP */
            // Deploy Sample AFTR Contract
            let txIds = await warpCreateContract(evolveTestContractA, sampleContractInitState, undefined, true);
            this.contractId = txIds.contractTxId;

            await this.readContract();
        },

        async buttonPress2() {
            this.evolveSrcId = await warpSaveNewSource(this.contractId, evolveTestContractB);

            // const txIds = await warpCreateContract(evolveTestContractB, JSON.stringify(this.vehicleTemplate), undefined, true);
            // this.evolveSrcId = txIds.srcTxId;
        },
        async buttonPress3() {
            // Evolve the contract
            const evolveTx = await warpEvolve(this.contractId, this.evolveSrcId);
            console.log("evolveTx: " + JSON.stringify(evolveTx));
            this.evolveSrcId = evolveTx.originalTxId;

            // Read state
            const result = await warpRead(this.contractId);
            this.contractState = result;
            this.contractSrcId = await this.getContractSourceId(this.contractId);
        },
        async buttonPress4() {
            // evolveTest is a new function in the contractB source
             const input = {
                function: "evolveTest"
             };
             const writeTx = await warpWrite(this.contractId, input);
             console.log("writeTx: " + writeTx);

             await this.readContract();
        },

        async getContractSourceId(txID) {
            const route = "http://localhost:1984/tx/" + txID;
            const response = await fetch(route).then(res=> res.json());
            const tx = new Transaction((await response));

            let allTags = [];
            tx.get("tags").forEach((tag) => {
                let key = tag.get("name", { decode: true, string: true });
                let value = tag.get("value", { decode: true, string: true });
                allTags.push({ key, value });
                console.log("TAGS: " + key + ": " + value);
            });
            for (let i = 0; i < allTags.length; i++) {
                if (allTags[i].key === "Contract-Src") {
                    return allTags[i].value;
                }
            }
        },
    }
}
</script>