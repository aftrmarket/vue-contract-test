<template>
    <div class="m-4">
        <div class="flex flex-row gap-2">
            <input v-model="network" value="mainnet" type="radio" name="radio-2" class="radio radio-primary" checked /> <span class="label-text">Mainnet</span> 
            <input v-model="network" value="testnet" type="radio" name="radio-2" class="radio radio-primary" /> <span class="label-text">Testnet</span>
            <input v-model="network" value="local" type="radio" name="radio-2" class="radio radio-primary" /> <span class="label-text">Local</span>
        </div>
        <div class="flex flex-col">
            <div><button @click="buttonPress1" class="btn mt-2">1. Create Sample Contracts</button></div>
            <div><label>Sample AFTR Contract: <span class="font-mono">{{ contractId }}</span></label></div>
            <div><label>PST Contract: <span class="font-mono">{{ contractIdPst }}</span></label></div>
            <div><button @click="buttonPress2" class="btn mt-2">2. Read Contracts</button></div>
        </div>
        <div class="mt-2">
            <button @click="buttonPress3" class="btn mt-2">3. Deposit Tokens</button>
        </div>
        <div class="mt-2">
            <input v-model="contractId" type="text" placeholder="Enter Contract ID" class="input input-bordered w-96" /><br/>
        </div>
        
        <button @click="buttonPress" class="btn mt-2">Read Contract</button>
        <button @click="buttonPressWrite" class="btn mt-2">Test Deposit</button>

        <div class="grid grid-cols-2 gap-4 p-4 border">
            <div class="pt-4 w-full">
                <p class="font-sans font-lg text-aftrBlue">AFTR Contract</p><br/>
                <vue-json-pretty :path="'res'" :data="contractState" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
            </div>
            <div class="pt-4 w-full">
                <p class="font-sans font-lg text-aftrBlue">PST</p><br/>
                <vue-json-pretty :path="'res'" :data="contractStatePst" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
            </div>
        </div>

    </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import pstInitState from "./../files/pstInitState.json?raw";
import sampleContractInitState from "./../files/sampleContractInitState.json?raw";
import sampleContractSrc from "./../files/sampleContractSrc.js?raw";

import { WarpFactory, defaultCacheOptions } from 'warp-contracts/web';
import Arweave from "arweave";
import {
    createContractFromTx,
    createContract,
    interactWrite,
    readContract,
} from "smartweave";

export default {
    components: { VueJsonPretty },
    data() {
        return {
            warp: {},
            contract: {},
            contractPst: {},
            network: "local",
            contractId: "",
            contractState: {},
            contractIdPst: "",
            contractStatePst: {},
            jwk: {},
            walletAddress: "",
        };
    },
    methods: {
        async buttonPress1() {
            this.warpInit();

            // this.jwk = await this.warp.arweave.wallets.generate();
            // this.walletAddress = await this.warp.arweave.wallets.jwkToAddress(this.jwk);

            // Deploy Sample AFTR Contract
            // try {
            //     let tx = await this.warp.createContract.deploy({
            //         wallet: "use_wallet",
            //         initState: sampleContractInitState,
            //         src: sampleContractSrc
            //     });
            //     this.contractId = tx.contractTxId;
            // } catch(e) {
            //     console.log("ERROR deploying AFTR contract: " + e);
            //     return;
            // }

            // Deploy PST Contract
            // try {
            //     let tx = await this.warp.createContract.deploy({
            //         wallet: this.jwk,
            //         initState: pstInitState,
            //         src: sampleContractSrc
            //     });
            //     this.contractIdPst = tx.contractTxId;
            // } catch(e) {
            //     console.log("ERROR deploying PST contract: " + e);
            //     return;
            // }


            // Using Arweave for now b/c above code didn't work
            let arweave = {};
            try {
                arweave = await Arweave.init({
                    host: "localhost",
                    port: "1984",
                    protocol: "http",
                    timeout: 20000,
                    logging: true,
                });
            } catch (e) {
                console.log("Error connecting to Arweave " + e);
            }

            this.contractId = await createContract(arweave, "use_wallet", sampleContractSrc, sampleContractInitState);
            this.contractIdPst = await createContract(arweave, "use_wallet", sampleContractSrc, pstInitState);
            
        },
        async buttonPress2() {
            if (this.contractId === "" || this.contractIdPst === "") {
                return;
            }
            await this.readContracts();
        },
        async buttonPress3() {
            // Setup claim on PST contract
            const transferQty = 1;
            const inputAllow = {
                function: "allow",
                target: this.contractId,
                qty: transferQty,
            };
    
            const { originalTxId, allowTxId } = await this.contractPst.writeInteraction(inputAllow);

            // Call AFTR contract to claim the tokens and update the AFTR vehicle tokens object
            const inputDeposit = {
                function: "deposit",
                tokenId: this.contractIdPst,
                qty: transferQty,
                txID: originalTxId,
            };

            const originalTxIdDep  = await this.contract.writeInteraction(inputDeposit);
            // const depTxId = await interactWrite(arweave, "use_wallet", this.contractId, inputDeposit);
            // let originalTxIdDep = depTxId;
            //await fetch("http://localhost:1984/mine");
            console.log("DEPOSIT: " + JSON.stringify(originalTxIdDep));

            // Now read both contracts again
            await this.readContracts();
        },
        async readContracts() {
            // Read AFTR contract
            this.contract = this.warpConnect(this.contractId);
            let result = await this.contract.readState();
            this.contractState = result.cachedValue;

            // Read PST contract
            this.contractPst = this.warpConnect(this.contractIdPst);
            result = await this.contractPst.readState();
            this.contractStatePst = result.cachedValue;   
        },
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
            const transferQty = 12;
            const inputAllow = {
                function: "allow",
                target: this.contractId,
                qty: transferQty,
            };

            const pstContractId = "6yXIsJFWYiiIAP3XQ7nYLY-NkgV_jdRGchE130FKOsQ";
            const contractPst = this.warpConnect(pstContractId);            
            const { originalTxId, allowTxId } = await contractPst.writeInteraction(inputAllow);


// Initializing Arweave
// let arweave = {};
// try {
//     arweave = await Arweave.init({
//         host: "localhost",
//         port: "1984",
//         protocol: "http",
//         timeout: 20000,
//         logging: true,
//     });
// } catch (e) {
//    console.log("Error connecting to Arweave " + e);
// }

            // const allowTxId = await interactWrite(arweave, "use_wallet", pstContractId, inputAllow);
            // let originalTxId = allowTxId;

            //await fetch("http://localhost:1984/mine");
            console.log("ALLOW: " + originalTxId + " | " + allowTxId);

            const inputDeposit = {
                function: "deposit",
                tokenId: pstContractId,
                qty: transferQty,
                txID: originalTxId,
            };

            const originalTxIdDep  = await this.contract.writeInteraction(inputDeposit);
            // const depTxId = await interactWrite(arweave, "use_wallet", this.contractId, inputDeposit);
            // let originalTxIdDep = depTxId;
            //await fetch("http://localhost:1984/mine");
            console.log("DEPOSIT: " + JSON.stringify(originalTxId));
        },
        warpInit() {
            try {
                // Using Warp
                if (this.network === "mainnet") {
                    this.warp = WarpFactory.forMainnet();
                } else if (this.network === "testnet") {
                    this.warp = WarpFactory.forTestnet();
                } else if (this.network === "local") {
                    this.warp = WarpFactory.forLocal();
                }
                console.log("Warp Initialized");
            } catch(e) {
                console.log(e);
                return;
            }
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