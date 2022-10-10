<template>
    <div class="m-4">
        <div class="flex flex-col">
            <div><button @click="buttonPress1" class="btn mt-2">1. Create Contracts</button></div>
            <div><label>Wallet Balance: <span class="font-mono">{{ toAr }}</span></label></div>
            <div><label>Warp Contract: <span class="font-mono">{{ contractId }}</span></label></div>
            <div><label>SmartWeave Contract: <span class="font-mono">{{ contractIdSw }}</span></label></div>
            <div><button @click="buttonPress2" class="btn mt-2">2. Read Contracts</button></div>
            <div><button @click="buttonPress3" class="btn mt-2">3. Mint</button></div>
        </div>
        <div class="grid grid-cols-2 gap-4 p-4 border">
            <div class="pt-4 w-full">
                <p class="font-sans font-lg text-aftrBlue">Warp</p><br/>
                <vue-json-pretty :path="'res'" :data="contractState" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
            </div>
            <div class="pt-4 w-full">
                <p class="font-sans font-lg text-aftrBlue">SmartWeave</p><br/>
                <vue-json-pretty :path="'res'" :data="contractStateSw" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
            </div>
        </div>
    </div>
</template>

<script>
import Transaction from 'arweave/node/lib/transaction';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
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
            contractIdSw: "",
            contractStateSw: {},
            jwk: {},
            walletAddress: "",
            transferQty: 1,
            txAllowId: "",
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

            this.$swal({
                icon: "info",
                html: "Creating 2 contracts, one using Warp deploy and the other using SmartWeave createContract.  You'll see that the write interaction will fail on the contract created from Warp.",
                showConfirmButton: true,
                allowOutsideClick: false
            });

            this.addr = wallet.address;
            await this.updateWalletBalance();
            await this.mintTokens();

            /*** WARP */
            // Deploy Sample AFTR Contract
            let txIds = await warpCreateContract(sampleContractSrc, sampleContractInitState);
            this.contractId = txIds.contractTxId;

            /*** SmartWeave */
            //Create new contracts
            this.contractIdSw = await createContract(this.arweave, "use_wallet", sampleContractSrc, sampleContractInitState);
            
            await this.updateWalletBalance();
        },
        async buttonPress2() {
            if (this.contractId === "" || this.contractIdSw === "") {
                return;
            }

            await this.readContracts();
            await this.updateWalletBalance();
            this.$swal({
                icon: "info",
                html: "Notice that readState returns differently.  The state value is a string for Warp and an object for SmartWeave.  Is this by design?",
                showConfirmButton: true,
                allowOutsideClick: false
            });
        },
        async buttonPress3() {
            const input = {
                function: "mint",
                qty: 1
            };


            let txId = await warpWrite(this.contractId, input);
            txId = await warpWrite(this.contractIdSw, input);

            // Now read both contracts again
            await this.readContracts();
            await this.updateWalletBalance();

            this.$swal({
                icon: "info",
                html: "Warp errors, while SmartWeave performs the 'mint' interaction.",
                showConfirmButton: true,
                allowOutsideClick: false
            });
        },
        async readContracts() {
            // Read AFTR contract
            let result = await warpRead(this.contractId);
            this.contractState = result;

            // Read PST contract
            result = await warpRead(this.contractIdSw);
            this.contractStateSw = result;
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
            //await new Promise(resolve => setTimeout(resolve, 2000));
            this.walletBalance = await this.arweave.wallets.getBalance(this.addr);
        },
    },
}
</script>