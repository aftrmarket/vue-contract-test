<template>
    <div class="m-4">
        <div class="flex flex-row gap-2">
            <input v-model="network" value="mainnet" type="radio" name="radio-2" class="radio radio-primary" checked /> <span class="label-text">Mainnet</span> 
            <input v-model="network" value="testnet" type="radio" name="radio-2" class="radio radio-primary" /> <span class="label-text">Testnet</span>
            <input v-model="network" value="local" type="radio" name="radio-2" class="radio radio-primary" /> <span class="label-text">Local</span>
        </div>
        <div class="mt-2">
            <input v-model="contractId" type="text" placeholder="Enter Contract ID" class="input input-bordered w-96" /><br/>
        </div>
        <div><button @click="buttonPress1" class="btn mt-2">1. Read Contract</button></div>
        <div>Contract Source ID: {{ contractSrcId }}</div>
        <div>Evolve Source ID: {{ evolveSrcId }}</div>
        <div>Evolve: {{ evolve }}</div>
        <div>New Source ID: {{ newSrcId }}</div>
        <div><button @click="buttonPress2" class="btn mt-2">2. Add New Source</button></div>
        <div><button @click="buttonPress3" class="btn mt-2">3. Evolve</button></div>
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
import evolvedContractSrc from "./../files/evolvedContractSrc.js?raw";

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
                "creator" : "",
                "ownership" : "single",
                "votingSystem" : "weighted",
                "claims": [],
                "claimable": [],
                "settings": [
                    [ "quorum", 0.5 ],
                    [ "support", 0.5 ],
                    [ "voteLength", 2160 ],
                    [ "communityLogo", "" ],
                    [ "evolve", null ]
                ]
            }
        };
    },
    computed: {

    },

/*** 
 * 1. Read contract (from input)
 * 2. Get contract source
 * 3. Create new contract source (using save)
 * 4. Evolve contract to new source
 * 5. Read contract again
 * 6. Test input to see if contract is on new source
 * 7. Read contract again
 * 8. See what is now listed as contract source (after the evolve)
 * 
 */
    methods: {
        async buttonPress1() {
            if (this.contractId === "") {
                return;
            }
            const result = await warpRead(this.contractId);
            this.contractState = result;
            this.contractSrcId = await this.getContractSourceId(this.contractId);
        },
        async buttonPress2() {
            /*** NOT WORKING - ASKING REDSTONE */
            //this.evolveSrcId = await warpSaveNewSource(evolvedContractSrc);

            const txIds = await warpCreateContract(evolvedContractSrc, JSON.stringify(this.vehicleTemplate), undefined, true);
            this.evolveSrcId = txIds.srcTxId;
        },
        async buttonPress3() {
            // Evolve the contract
            const evolveTx = await warpEvolve(this.contractId, this.evolveSrcId);

            // Read state
            const result = await warpRead(this.contractId);
            this.contractState = result;
            //this.contractSrcId = await this.getContractSourceId(this.contractId);
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