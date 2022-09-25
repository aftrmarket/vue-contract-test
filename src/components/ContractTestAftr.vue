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
            <div class="prose"><h3>Write Interactions</h3></div>
            <div><button @click="buttonPress3" class="btn mt-2">3. Deposit Tokens</button></div>
            <div><button @click="buttonPress4" class="btn mt-2">4. Withdrawal Tokens</button></div>
        </div>
        <div class="grid grid-cols-2 gap-4 p-4 border">
            <div class="pt-4 w-full">
                <p class="font-sans font-lg text-aftrBlue">AFTR Contract Read</p><br/>
                <vue-json-pretty :path="'res'" :data="contractState" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
            </div>
            <div class="pt-4 w-full">
                <p class="font-sans font-lg text-aftrBlue">AFTR Contract Read Delayed</p><br/>
                <vue-json-pretty :path="'res'" :data="contractStateDelayed" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
            </div>
        </div>
        <div class="pt-4 w-full">
            <vue-json-pretty :path="'res'" :data="contractStatePst" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
        </div>
    </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import sampleContractSrc from "./../files/sampleAftrContractSrc.js?raw";

import { WarpFactory } from 'warp-contracts/web';
import Arweave from "arweave";
import { createContractFromTx, createContract, interactWrite, readContract } from "smartweave";
import { vModelText } from 'vue';

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
            walletAddress: "",
            transferQty: 500,
            txAllowId: "",
            contractStateDelayed: {},
            aftrContractId: "",
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
            },

            pstTemplate: {
                "name": "Vint",
                "ticker": "VINT",
                "balances": {},
                "claimable": [],
                "claims": [],
                "settings": [
                [ "quorum", 0.5 ],
                [ "support", 0.5 ],
                [ "voteLength", 2160 ],
                [ "lockMinLength", 129600 ],
                [ "lockMaxLength", 1051200 ],
                [ "communityAppUrl", "" ],
                [ "communityDiscussionLinks", [ "" ] ],
                [ "communityDescription", "" ],
                [ "communityLogo", "" ] ]
            },
        };
    },
    computed: {
        toAr() {
            return this.walletBalance/1000000000000;
        }
    },
    methods: {
        async buttonPress1() {
            this.resetOutputs();

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

            this.addr = wallet.address;
            await this.updateWalletBalance();
            await this.mintTokens();
            this.warpInit();

            // Create sample AFTR Vehicle from source
            let swTags = [{ name: "Protocol", value: "TEST" }];
            
            // Init state defaults
            this.vehicleTemplate.name = "Sample AFTR Vehicle";
            this.vehicleTemplate.ticker = "AFTR";
            this.vehicleTemplate.creator = this.addr;
            this.vehicleTemplate.balances[this.addr] = 1;

            // Create AFTR source contract
            this.contractId = await createContract(this.arweave, "use_wallet", sampleContractSrc, JSON.stringify(this.vehicleTemplate));
            const aftrContractSrcId = await this.getContractSourceId(this.contractId);
            
            // Create PST contract, give user 1000 tokens.
            this.pstTemplate.balances[this.addr] = 1000;
            this.contractIdPst = await createContract(this.arweave, "use_wallet", sampleContractSrc, JSON.stringify(this.pstTemplate));

            await this.updateWalletBalance();
        },
        async buttonPress2() {
            if (this.contractId === "" || this.contractIdPst === "") {
                alert("No contracts to read!");
                return;
            }
            this.$swal({
                icon: "info",
                html: "Reading Contracts.  The right side is the same AFTR contract just delayed 5 seconds.",
                showConfirmButton: false,
                allowOutsideClick: false,
                didOpen: () => {
                    this.$swal.showLoading()
                },
            });
            this.resetOutputs();
            await this.readContracts();
            await this.updateWalletBalance();
            this.$swal.close();
        },
        async buttonPress3() {
            this.$swal({
                icon: "info",
                html: "Deposit Interactions, then reading the contracts again...",
                showConfirmButton: false,
                allowOutsideClick: false,
                didOpen: () => {
                    this.$swal.showLoading()
                },
            });
            this.resetOutputs();
            // Give another wallet a balance
            let inputMint = {
                function: "plygnd-mint",
                qty: 100
            };
            //let txMint = await this.warpWrite(this.contract, inputMint);
            let txMint  = await this.contract.writeInteraction(inputMint);
            console.log("PLAYGROUND MINT: " + JSON.stringify(txMint));

            inputMint = {
                function: "plygnd-mint",
                qty: 100
            };
            txMint  = await this.contract.writeInteraction(inputMint);
            console.log("PLAYGROUND MINT: " + JSON.stringify(txMint));

            // Setup claim on PST contract
            const inputAllow = {
                function: "allow",
                target: this.contractId,
                qty: this.transferQty,
            };
    
            const { originalTxId, allowTxId } = await this.contractPst.writeInteraction(inputAllow);
            this.txAllowId = originalTxId;

            // Call AFTR contract to claim the tokens and update the AFTR vehicle tokens object
            const inputDeposit = {
                function: "deposit",
                tokenId: this.contractIdPst,
                qty: this.transferQty,
                txID: this.txAllowId,
            };

            const originalTxIdDep  = await this.contract.writeInteraction(inputDeposit);
            console.log("DEPOSIT: " + JSON.stringify(originalTxIdDep));

            // Now read both contracts again
            await this.readContracts();
            await this.updateWalletBalance();
            this.$swal.close();
        },
        async buttonPress4() {
            this.$swal({
                icon: "info",
                html: "Withdrawal Interaction, with a read following...",
                showConfirmButton: false,
                allowOutsideClick: false,
                didOpen: () => {
                    this.$swal.showLoading()
                },
            });

            // Look up tx from the previous Deposit
            const tokenObj = this.contractState.state.tokens.find( (token) => (token.txID === this.txAllowId) );

            const inputWd = {
                function: "propose",
                type: "withdrawal",
                txID: this.txAllowId,
                target: tokenObj.source,
                qty: 2
            };

            this.resetOutputs();

            console.log("WITHDRAWAL INPUT: " + JSON.stringify(inputWd));
            const originalTxWd = await this.warpWrite(this.contract, inputWd);
            console.log("WITHDRAWAL: " + JSON.stringify(originalTxWd));
            
            await this.readContracts();
            this.$swal.close();

            this.$swal({
                icon: "error",
                html: "Look at the token object.  The balance is showing a different amount.  The JSON objects being displayed come from 1 readState() just with a of 5 seconds.  This shows that the result changes after it's read initially.",
                showConfirmButton: true,
                allowOutsideClick: false,
            });

            
        },
        async readContracts() {
            // Read AFTR contract
            this.contract = this.warpConnect(this.contractId);
            let result = await this.contract.readState();
            this.contractState = result.cachedValue;

            // Read PST contract
            this.contractPst = this.warpConnect(this.contractIdPst);
            let resultPst = await this.contractPst.readState();
            this.contractStatePst = resultPst.cachedValue; 

            // Look at AFTR contract again
            await new Promise(resolve => setTimeout(resolve, 5000));
            this.contractStateDelayed = result.cachedValue;
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
                        internalWrites: true,
                     })
                    .connect("use_wallet");
                return contract;
            } catch (e) {
                console.log(e);
                return {};
            }
        },
        async warpWrite(contract, input) {
            try {
                const originalTx = await contract.writeInteraction(input);
                return originalTx;
            } catch(e) {
                console.log("ERROR performing write interaction: " + e);
                return {};
            }
        },
        resetOutputs() {
            this.contractState = {};
            this.contractState = {};
            this.contractStatePst = {};
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
    },}
</script>