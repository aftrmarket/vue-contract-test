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
        
        <button @click="buttonPress" class="btn mt-2">Read Contract</button>

        <div class="mt-4">
            <span v-if="contractState == {}">Enter a Contract ID and press the READ CONTRACT button.</span>
            <vue-json-pretty v-else :path="'res'" :data="contractState" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
        </div>

    </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

import { WarpFactory, defaultCacheOptions } from 'warp-contracts/web';

export default {
    components: { VueJsonPretty },
    data() {
        return {
            network: "mainnet",
            contractId: "",
            contractState: {},
        };
    },
    methods: {
        async buttonPress() {
            if (this.contractId === "") {
                return;
            }

            // Try to get wallet, if fails, connect so user can assign permissions
            let wallet = "";
            try {
                wallet = await window.arweaveWallet.getActiveAddress();
            } catch(e) {
                console.log(e);
                const promiseResult = await window.arweaveWallet.connect([
                    "ACCESS_ADDRESS",
                    "ACCESS_ALL_ADDRESSES",
                    "SIGN_TRANSACTION",
                    "ACCESS_ARWEAVE_CONFIG"
                ]);
                wallet = await window.arweaveWallet.getActiveAddress();
            }

            try {
                // Using Warp
                let warp = {};
                if (this.network === "mainnet") {
                    warp = WarpFactory.forMainnet();
                } else if (this.network === "testnet") {
                    warp = WarpFactory.forTestnet();
                } else if (this.network === "local") {
                    warp = WarpFactory.forLocal();
                }
                
                const contract = warp.contract(this.contractId)
                    .setEvaluationOptions( { allowUnsafeClient: true } )
                    .connect("use_wallet");
                const { cachedValue } = await contract.readState();
                let state = cachedValue;
                this.contractState = state;
            } catch(e) {
                console.log(e);
            }
        }
    }
}
</script>