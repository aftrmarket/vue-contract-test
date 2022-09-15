<template>
    <div class="m-4">
        <div class="flex flex-row gap-2">
            <input v-model="network" value="mainnet" type="radio" name="radio-2" class="radio radio-primary" checked /> <span class="label-text">Mainnet</span> 
            <input v-model="network" value="testnet" type="radio" name="radio-2" class="radio radio-primary" /> <span class="label-text">Testnet</span>
            <input v-model="network" value="local" type="radio" name="radio-2" class="radio radio-primary" /> <span class="label-text">Local</span>
        </div>
        <div class="flex flex-col">
            <div><button @click="buttonPress1" class="btn mt-2">1. Create Sample Contracts</button></div>
            <div><label>Wallet Balance: <span class="font-mono">{{ toAr }}</span></label></div>
            <div><label>Sample AFTR Contract: <span class="font-mono">{{ contractId }}</span></label></div>
            <div><label>PST Contract: <span class="font-mono">{{ contractIdPst }}</span></label></div>
            <div><button @click="buttonPress2" class="btn mt-2">2. Read Contracts</button></div>
        </div>
        <div class="mt-2 mb-4">
            <button @click="buttonPress3" class="btn mt-2">3. Deposit Tokens</button>
        </div>
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
            <div class="mt-2">
                <input v-model="contractIdRead" type="text" placeholder="Enter Contract ID" class="input input-bordered w-96" /><br/>
            </div>
            <div><button @click="buttonPressRead" class="btn mt-2">4. Read PST Contract Again</button></div>
            <div class="pt-4 w-full">
                <vue-json-pretty :path="'res'" :data="contractStateRead" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
            </div>
        <div>
        </div>
    </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import pstInitState from "./../files/pstInitState.json?raw";
import sampleContractInitState from "./../files/sampleContractInitState.json?raw";
import sampleContractSrc from "./../files/sampleContractSrc.js?raw";

import { WarpFactory } from 'warp-contracts/web';
import Arweave from "arweave";
import { createContractFromTx, createContract, interactWrite, readContract } from "smartweave";

export default {
    components: { VueJsonPretty },
    data() {
        return {
            arweave: {},
            addr: "",
            warp: {},
            contract: {},
            contractPst: {},
            walletBalance: 0,
            network: "local",
            contractId: "",
            contractState: {},
            contractIdPst: "",
            contractStatePst: {},
            jwk: {},
            walletAddress: "",
            contractIdRead: "",
            contractRead: {},
            contractStateRead: {},
        };
    },
    computed: {
        toAr() {
            return this.walletBalance/1000000000000;
        }
    },
    methods: {
        async buttonPress1() {
            if (this.network !== "local") {
                alert("Test app is currently only configured to run on an Arlocal instance.");
                return;
            }
            this.addr = await this.arweave.wallets.jwkToAddress("use_wallet");
            await this.updateWalletBalance();
            await this.mintTokens();
            this.warpInit();

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

            // Create new contracts
            this.contractId = await createContract(this.arweave, "use_wallet", sampleContractSrc, sampleContractInitState);
            const aftrContractSrcId = await this.getContractSourceId(this.contractId);

            // Test using createContractFromTx
            let swTags = [{ name: "Protocol", value: "TEST" }];
            this.contractIdPst = await createContractFromTx(this.arweave, "use_wallet", aftrContractSrcId, pstInitState, swTags);
            this.contractIdRead = this.contractIdPst;

            // Test using createContract
            //this.contractIdPst = await createContract(this.arweave, "use_wallet", sampleContractSrc, pstInitState);

            // Use hard-coded values for contracts
            // this.contractId = "ksc9xhdFtg_VMv19ZGPEumhKcVzDvK2Zqm6yIoyCWO8";
            // this.contractIdPst = "j8e-3qNnLSQRPNB1pN84zy0XKEmAyo7cKIcxqVGaPDw";
            
            await this.updateWalletBalance();
        },
        async buttonPress2() {
            if (this.contractId === "" || this.contractIdPst === "") {
                return;
            }
            await this.readContracts();
            await this.updateWalletBalance();
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
            console.log("DEPOSIT: " + JSON.stringify(originalTxIdDep));

            // Now read both contracts again
            await this.readContracts();
            await this.updateWalletBalance();
        },
        async buttonPressRead() {
            if (this.contractIdRead === "") {
                return;
            }

            /*** THE NEXT TIME WARP GETS INITIALIZED, THE CLAIMS CHANGE WHEN THE CONTRACT IS READ! */
            this.warpInit();

            // Read contract from textbox ID
            this.contractRead = this.warpConnect(this.contractIdRead);
            let result = await this.contractRead.readState();
            this.contractStateRead = result.cachedValue;
        },
        async readContracts() {
            // Read AFTR contract
            this.contract = this.warpConnect(this.contractId);
            let result = await this.contract.readState();
            this.contractState = result.cachedValue;

            // Read PST contract
            this.contractPst = this.warpConnect(this.contractIdPst);
            
            // Mint tokens for user on PST contract
            let input = {
                function: "mint",
                qty: 10000
            };

            // Using Warp
            let mintTx = await this.contractPst.writeInteraction(input);
            console.log("MINT TX: " + mintTx.originalTxId);

            // Using SmartWeave
            // let mintTx = await interactWrite(this.arweave, "use_wallet", this.contractIdPst, input);
            // await fetch("http://localhost:1984/mine");
            //console.log("MINT TX: " + mintTx);

            result = await this.contractPst.readState();
            this.contractStatePst = result.cachedValue;   
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
        },
        async mintTokens() {
            try {
                // Amounts are in Winstons
                if (this.walletBalance < 10000000000000) {
                    await fetch("http://localhost:1984/mint/" + this.addr + "/10000000000000");
                }
            } catch(e) {
                console.log("ERROR trying to give wallet some AR: " + e);
            }
        },
        async updateWalletBalance() {
            // Show how wallet is impacted after every transaction
            this.walletBalance = await this.arweave.wallets.getBalance(this.addr);
        },
        async getContractSourceId(txID) {
            let tx = await this.arweave.transactions.get(txID);
            let allTags = [];
            tx.get("tags").forEach((tag) => {
                let key = tag.get("name", { decode: true, string: true });
                let value = tag.get("value", { decode: true, string: true });
                allTags.push({key, value, });
            });
            for (let i = 0; i < allTags.length; i++) {
                if (allTags[i].key === "Contract-Src") {
                    return allTags[i].value;
                }
            }
        },
    },
    async mounted() {
        this.arweave = await Arweave.init({
            host: "localhost",
            port: "1984",
            protocol: "http",
            timeout: 20000,
            logging: true,
        });
    },
}
</script>