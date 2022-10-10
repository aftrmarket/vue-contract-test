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
        <div class="flex flex-col mt-2 mb-4">
            <div class="prose"><h3>Write Interactions - Deposit, then put back with a Withdrawal</h3></div>
            <div><button @click="buttonPress3" class="btn mt-2">3. Deposit Tokens</button></div>
            <div><button @click="buttonPress4" class="btn mt-2">4. Withdrawal Tokens</button></div>
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
        <div><button @click="buttonPressRead" class="btn mt-2">5. Read PST Contract Again</button></div>
        <div class="pt-4 w-full">
            <vue-json-pretty :path="'res'" :data="contractStateRead" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
        </div>
        <div class="mt-2">
            <input v-model="contractIdFromInput" type="text" placeholder="Enter Contract ID" class="input input-bordered w-96" /><br/>
        </div>
        <div><button @click="buttonPressReadFromInput" class="btn mt-2">Read Contract From Input</button></div>
        <div class="pt-4 w-full">
            <vue-json-pretty :path="'res'" :data="contractFromInputState" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
        </div>
    </div>
</template>

<script>
import Transaction from 'arweave/node/lib/transaction';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import pstInitState from "./../files/pstInitState.json?raw";
import sampleContractInitState from "./../files/sampleContractInitState.json?raw";
import sampleContractSrc from "./../files/sampleContractSrc.js?raw";
import { createContract, createContractFromTx } from "smartweave";
import { arweaveInit, warpCreateContract, warpCreateFromTx, warpInit, warpRead, warpWrite } from "./utils/warpUtils.js";

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
            transferQty: 1,
            txAllowId: "",
            contractIdFromInput: "",
            contractFromInput: {},
            contractFromInputState: {},
        };
    },
    computed: {
        toAr() {
            return this.walletBalance/1000000000000;
        }
    },
    methods: {
        async buttonPress1() {
            this.arweave = arweaveInit();
            
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
            //this.addr = await this.arweave.wallets.jwkToAddress("use_wallet");
            this.addr = wallet.address;
            await this.updateWalletBalance();
            await this.mintTokens();

            // Deploy Sample AFTR Contract
            let txIds = await warpCreateContract(sampleContractSrc, sampleContractInitState);
            const aftrContractSrcId = txIds.srcTxId;
            this.contractId = txIds.contractTxId;
            //let compareId = await this.getContractSourceId(this.contractId);
            //console.log("COMPARE SRC ID: " + compareId);
            await this.getTags(this.contractId);

            // Deploy PST Contract
            let swTags = [{ name: "PP", value: "Poop" }];
            txIds = await warpCreateFromTx(pstInitState, aftrContractSrcId, swTags);
            this.contractIdPst = txIds.contractTxId;
            //compareId = await this.getContractSourceId(this.contractId);
            //console.log("COMPARE SRC ID: " + compareId);

            await this.getTags(this.contractIdPst);

            // Create new contracts
            //this.contractId = await createContract(this.arweave, "use_wallet", sampleContractSrc, sampleContractInitState);
            //const aftrContractSrcId = await this.getContractSourceId(this.contractId);

            // Test using createContractFromTx
            //let swTags = [{ name: "Protocol", value: "TEST" }];
            //this.contractIdPst = await createContractFromTx(this.arweave, "use_wallet", aftrContractSrcId, pstInitState, swTags);
            //this.contractIdRead = this.contractIdPst;

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
            const inputAllow = {
                function: "allow",
                target: this.contractId,
                qty: this.transferQty,
            };
    
            //const { originalTxId, allowTxId } = await this.contractPst.writeInteraction(inputAllow);
            //this.txAllowId = originalTxId;

            this.txAllowId = await warpWrite(this.contractIdPst, inputAllow);

            // Call AFTR contract to claim the tokens and update the AFTR vehicle tokens object
            const inputDeposit = {
                function: "deposit",
                tokenId: this.contractIdPst,
                qty: this.transferQty,
                txID: this.txAllowId,
            };

            // const originalTxIdDep  = await this.contract.writeInteraction(inputDeposit);
            
            const originalTxIdDep = await warpWrite(this.contractId, inputDeposit);            
            
            console.log("DEPOSIT: " + JSON.stringify(originalTxIdDep));

            // Now read both contracts again
            await this.readContracts();
            await this.updateWalletBalance();
        },
        async buttonPress4() {
            // Look up tx from the previous Deposit
            const tokenObj = this.contractState.state.tokens.find( (token) => (token.txID === this.txAllowId) );
    
            const inputWd = {
                function: "withdrawal",
                txID: this.txAllowId,
                target: tokenObj.source,
                qty: this.transferQty
            };
            console.log("WITHDRAWAL INPUT: " + JSON.stringify(inputWd));
            const originalTxWd = await this.warpWrite(this.contract, inputWd);
            console.log("WITHDRAWAL: " + JSON.stringify(originalTxWd));
            
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
        async buttonPressReadFromInput() {
            let warp = warpInit();
            //this.contractFromInput = this.warpConnect(this.contractIdFromInput);
            let result = await warpRead(warp, this.contractIdFromInput);
            //let result = await this.contractFromInput.readState();
            this.contractFromInputState = result.state;
        },
        async readContracts() {
            // Read AFTR contract
            let result = await warpRead(this.contractId);
            this.contractState = result;

            // Read PST contract
            result = await warpRead(this.contractIdPst);
            this.contractStatePst = result;
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
            await new Promise(resolve => setTimeout(resolve, 2000));
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
        async getTags(txId) {
            const route = "http://localhost:1984/tx/" + txId;
            let response = await fetch(route).then(res=> res.json());
            const tx = new Transaction((await response));
            
            let allTags = [];
            tx.get("tags").forEach((tag) => {
                let key = tag.get("name", {decode: true, string: true});
                let value = tag.get("value", {decode: true, string: true});
                allTags.push({key, value});
            });

            console.log(JSON.stringify(allTags));
        }
    },
}
</script>