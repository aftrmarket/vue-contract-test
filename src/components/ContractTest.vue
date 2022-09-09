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
        <button @click="buttonPressWrite" class="btn mt-2">Test Deposit</button>

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
            warp: {},
            contract: {},
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
            try {
                // Using Warp
                if (this.network === "mainnet") {
                    this.warp = WarpFactory.forMainnet();
                } else if (this.network === "testnet") {
                    this.warp = WarpFactory.forTestnet();
                } else if (this.network === "local") {
                    this.warp = WarpFactory.forLocal();
                }
            } catch(e) {
                console.log(e);
                return;
            }

            try {
                this.contract = this.warpConnect(this.contractId);
    
                const { cachedValue } = await this.contract.readState();
                let state = cachedValue;
                this.contractState = state;
            } catch(e) {
                console.log(e);
            }
        },
        async buttonPressWrite() {

            const inputAllow = {
                function: "allow",
                target: this.contractId,
                qty: 10,
            };

            const pstContractId = "4mhMltWZ5OefhGjF_DuiT7k-ZHKd8N6sLZo93Pu4H6U";
            const contractPst = this.warpConnect(pstContractId);            
            const { originalTxId, allowTxId } = await contractPst.writeInteraction(inputAllow);
            //await fetch("http://localhost:1984/mine");
            console.log("ALLOW: " + originalTxId + " | " + allowTxId);

            const inputDeposit = {
                function: "deposit",
                tokenId: pstContractId,
                qty: 10,
                txID: originalTxId,
            };

            const { originalTxIdDep, depTxId } = await this.contract.writeInteraction(inputDeposit);
            //await fetch("http://localhost:1984/mine");
            console.log("DEPOSIT: " + originalTxIdDep + " | " + depTxId);
        },
        warpConnect(contractId) {
            try {
                const contract = this.warp.contract(contractId)
                    .setEvaluationOptions({ 
                        allowUnsafeClient: true,
                        internalWrites: true,
                     })
                    .connect("use_wallet");
                return contract;
            } catch (e) {
                console.log(e);
                return {};
            }
        }
    },
}
</script>