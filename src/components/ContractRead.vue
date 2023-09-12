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
        <div><button @click="buttonPress" class="btn mt-2">Read Contract</button></div>
        <div>Wallet: {{ walletValue }}</div>
        <div>Evolve: {{ evolveValue }}</div>
        <div class="pt-4 w-full">
            <vue-json-pretty :path="'res'" :data="contractState" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
        </div>
    </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import Arweave from "arweave";
import { warpRead } from "./utils/warpUtils.js";

const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
});

export default {
    components: { VueJsonPretty },
    data() {
        return {
            network: "mainnet",
            contractId: "KvgS1Ikrc_gnveocS_YMgRmBGH5eic61dFXKWpSzjMw",
            contractState: {},
            evolve: "",
            walletAddress: "",
        };
    },
    computed: {
        walletValue() {
            if (this.walletAddress === "") {
                return "None connected";
            } else {
                return this.walletAddress;
            }
        },
        evolveValue() {
            if (this.evolve === "") {
                return "No Value";
            } else {
                return this.evolve;
            }
        }
    },
    methods: {
        async buttonPress() {
            if (this.contractId === "") {
                return;
            }
            //this.walletAddress = await window.arweaveWallet.getActiveAddress();
            const result = await warpRead(this.contractId, true, "PROD");
            // this.evolve = result.state.evolve;
            this.contractState = result;
            console.log(JSON.stringify(result));

            //let txType = await this.testForType();
            //alert(txType);
        },
        async testForType() {
            let txType = "";
            try {
                let smartweaveContract = false;
                let aftrVehicle = false;
                const tx = await arweave.transactions.get(this.contractId);
                for (let tag of tx.tags) {
                    let key = tag.get("name", {decode: true, string: true});
                    let value = tag.get('value', {decode: true, string: true});
                    if (key === "App-Name" && value === "SmartWeaveContract") {
                        smartweaveContract = true;
                    }
                    if (key === "Protocol" && value === "AFTR-PLAY") {
                        aftrVehicle = true;
                    }
                }
                if (aftrVehicle) {
                    txType = "AFTR Vehicle";
                } else if (smartweaveContract) {
                    txType = "SmartWeave Contract";
                } else {
                    txType = "UNSURE";
                }
            } catch(e) {
                console.log("ERROR when getting the tx. " + e);
                txType = "UNSURE";
            }

            if (txType !== "UNSURE") {
                return txType;
            }

            // Test for address
            try {
                const balance = await arweave.wallets.getBalance(this.contractId);
                let winston = balance;
                let ar = arweave.ar.winstonToAr(balance);
                console.log(winston);
                console.log(ar);
            
                if (Number(ar) > 0) {
                    txType = "Address";
                } else {
                    txType = "Unknown - could be a wallet address with 0 AR";
                }
            } catch(e) {
                console.log("ERROR when getting balance. " + e);
            }

            return txType;
        },
    }
}
</script>