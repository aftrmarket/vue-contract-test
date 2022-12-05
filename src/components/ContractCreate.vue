<template>
    <div class="m-4">
        <div class="flex flex-row gap-2">
            <input v-model="network" value="PROD" type="radio" name="radio-2" class="radio radio-primary" @change="networkSelect"/> <span class="label-text">Mainnet</span> 
            <input v-model="network" value="TEST" type="radio" name="radio-2" class="radio radio-primary" @change="networkSelect" /> <span class="label-text">Testnet</span>
            <input v-model="network" value="DEV" type="radio" name="radio-2" class="radio radio-primary" @change="networkSelect" /> <span class="label-text">Local</span>
        </div>
        <div>Active Wallet: {{ toAr }}</div>
        <div class="mt-2">
            <input v-model="eContractId" type="text" placeholder="Enter Contract ID" class="input input-bordered w-96" />
            <button @click="buttonAdd" class="btn mt-2">Add to Wallet</button>
        </div>
        <div><button @click="buttonPress1" class="btn mt-2">1. Use Existing Contract</button></div>
        <div><button @click="buttonPress2" class="btn mt-2">2. Create Contract</button></div>
        <div>Contract ID: {{ contractId }}</div>
        <div>Contract Source ID: {{ contractSrcId }}</div>
        <div>New Source ID: {{ newSrcId }}</div>
        <div><button @click="buttonPress3" class="btn mt-2">3. Add New Source</button></div>
        <div class="pt-2 pb-2">
            <textarea v-model="queryInput" class="textarea textarea-bordered" placeholder="Enter Query" rows="10" cols="100">
            </textarea>
        </div>
        <div><button @click="buttonPress4" class="btn mt-2">4. Run Query</button></div>
        <div v-if="errorMsg !== ''"><label>{{ errorMsg }}</label></div>
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
import contractSrc from "./../files/aftrContractSrcPlayground.js?raw";
import newContractSrc from "./../files/aftrContractSrc.js?raw";
import initState from "./../files/aftrInitState.json?raw";

const queryProtocol = "AFTR-PLAY";

export default {
    components: { VueJsonPretty },
    data() {
        return {
            aftrContractSrcs: import.meta.env.VITE_AFTR_CONTRACT_SOURCES,
            network: "",
            contractId: "",
            eContractId: "",
            contractState: {},
            contractSrcId: "",
            newSrcId: "",
            routeProtocol: "http",
            routeHost: "localhost",
            routePort: "1984",
            walletBalance: 0,
            walletAddr: "",
            errorMsg: "",
            tags: [],

            queryInput: `
            query {
                transactions(
                    tags:[
                        { name: "App-Name", values: ["SmartWeaveContract"] }
                    ]
                )
                {
                    edges {
                        node {
                            id
                            tags {name, value}
                        }
                    }
                }
            }`,
        };
    },
    computed: {
        toAr() {
            return this.walletBalance/1000000000000;
        }
    },
    watch: {
        network() {
            if (this.network === "DEV") {
                this.routeProtocol = "http";
                this.routePort = "1984";
                this.routeHost = "localhost";
            } else if (this.network === "TEST") {
                this.routeProtocol = "https";
                this.routePort = "443";
                this.routeHost = "arweave.net";
            } else if (this.network === "PROD") {
                this.routeProtocol = "https";
                this.routePort = "443";
                this.routeHost = "arweave.net";
            } else {
                alert("No route can be determined");
            }
        },
    },

/*** 
 * 1. Set Contract ID to equal existing contract and read contract
 * 2. Create new contract
 * 3. Add new source to what is set to contractId
 */
    methods: {
        async networkSelect() {
            try {
                this.walletAddr = await window.arweaveWallet.getActiveAddress();
            } catch(e) {
                console.log(e);
                const promiseResult = await window.arweaveWallet.connect([
                    "ACCESS_ADDRESS",
                    "ACCESS_ALL_ADDRESSES",
                    "SIGN_TRANSACTION",
                    "ACCESS_ARWEAVE_CONFIG",
                ]);
                this.walletAddr = await window.arweaveWallet.getActiveAddress();
            }
            await this.updateWalletBalance();
        },
        async readContract() {
            if (this.contractId === "") {
                return;
            }
            const result = await warpRead(this.contractId, undefined, this.network);
            this.contractState = result;
            this.contractSrcId = await this.getContractSourceId(this.contractId);
        },
        reset() {
            this.eContractId = "";
            this.contractId = "";
            this.contractState = {};
            this.contractSrcId = "";
            this.newSrcId = "";
            this.errorMsg = "";
        },
        async buttonAdd() {
            if (this.eContractId === "") {
                alert("Please enter a Contract ID.");
                return;          
            }
            let response = await window.arweaveWallet.addToken(this.eContractId);
            console.log(response);
        },
        async buttonPress1() {
            if (this.eContractId === "") {
                alert("Please enter a Contract ID.");
                return;
            }
            this.contractId = this.eContractId;
            //this.contractSrcId = await this.returnContractSrc(this.contractId);
            await this.readContract();
            await this.updateWalletBalance();
            //console.log(await this.findIdType(this.contractId));
            
        },
        async buttonPress2() {
            this.reset();

            /*** WARP */
            // Deploy Sample AFTR Contract
            let txIds = await warpCreateContract(newContractSrc, initState, undefined, true, this.network);
            this.contractId = txIds.contractTxId;

            await this.readContract();
            await this.updateWalletBalance();
        },
        async buttonPress3() {
            this.newSrcId = await warpSaveNewSource(this.contractId, newContractSrc, this.network);
            await this.updateWalletBalance();
        },
        async buttonPress4() {
            if (this.network == "") {
                alert("Please select a network.");
                return;
            }
            // if (this.queryInput == "") {
            //     alert("Please enter query.");
            //     return;
            // }
            this.reset();
            //const arweave = arweaveInit(this.network);
            // const query = this.queryInput;
            // let response = {};
            // try {
            //     response = await arweave.api.post("graphql", { query });
            //     this.contractState = response;
            // } catch (e) {
            //     this.errorMsg = e;
            // }

            let psts = [
                // {
                //     contractId: "",
                //     tags: []
                // }
            ];
            //const txs = response.data.data.transactions.edges;

            // for (let tx of txs) {
            //     psts.push(
            //         tx.node.id,
            //         tx.node.tags
            //     );
            // }

            let cursor = "";
            let hasNextPage = true;
            let totalCount = 0;
            this.queryInput = "";
            while (hasNextPage) {
                let responseString = await this.runQuery(cursor);
                console.log(responseString);
                let respObj = JSON.parse(responseString);
                hasNextPage = respObj.data.data.transactions.pageInfo.hasNextPage;
                let txs = respObj.data.data.transactions.edges;
                for (let tx of txs) {
                    psts.push(
                        {
                            contractId: tx.node.id,
                            tags: tx.node.tags
                        }
                    );
                    totalCount++;
                    cursor = tx.cursor;
                    this.queryInput += tx.node.id + "\n";
                }
            }
            alert("TOTAL: " + totalCount);
        },
        async runQuery(cursor = "", pageLength = 100) {
            const arweave = arweaveInit(this.network);
            const query = `query($cursor: String) {
                transactions(
                    tags: [ 
                        { name: "App-Name", values: ["SmartWeaveContract"] }
                    ]
                    first: ${pageLength}
                    after: $cursor
                ) {
                    pageInfo {
                        hasNextPage
                    }
                    edges {
                        cursor
                        node { id } 
                    }
                }
            }`;
            let response = "";
            try {
                const respData = await arweave.api.post("graphql", {
                    query,
                    variables: { "cursor": cursor }
                });
                response = JSON.stringify(respData);
            } catch(e) {
                response = e;
            }
            return response;
        },
        async updateWalletBalance() {
            const arweave = arweaveInit(this.network);
            this.walletBalance = await arweave.wallets.getBalance(this.walletAddr);
        },
        async getContractSourceId(txID) {
            let route = "";
            let response = {};
            if (this.network === "DEV") {
                route = this.routeProtocol + "://" + this.routeHost + ":" + this.routePort + "/tx/" + txID;
                response = await fetch(route).then(res=> res.json());
                this.tags = this.interactionTagsParser(response);
            } else {
                route = `https://gateway.redstone.finance/gateway/contract?txId=${txID}${this.network === "TEST" ? "&testnet=true" : ""}`;
                response = await fetch(route);
                if (!response.ok) {
                    alert("Could not fetch contract.");
                    return;
                }
                const data = await response.json();
                return data.srcTxId;
            }

            for (let i = 0; i < this.tags.length; i++) {
                if (this.tags[i].key === "Contract-Src") {
                    return this.tags[i].value;
                }
            }
        },
        interactionTagsParser(tx) {
            const contractTx = new Transaction(tx);
            let tags = [];
            contractTx.get('tags').forEach((tag) => {
                let key = tag.get('name', { decode: true, string: true });
                let value = tag.get('value', { decode: true, string: true });
                tags.push({ key, value });
            });
            return tags;
        },
        async returnContractSrc(contractId) {
            const arweave = arweaveInit(this.network);
            let tx = await arweave.transactions.get(contractId);
            let contractSrcId = "";

            tx.get('tags').every(tag => {
                let key = tag.get('name', {decode: true, string: true});
                let value = tag.get('value', {decode: true, string: true});
                if (key === "Contract-Src") {
                    contractSrcId = value;
                    return false;
                }
                return true;
            });
            return contractSrcId;
        },
        parseTags(txId) {
            const tx = new Transaction(txId);
            let txType = "";
            let smartweaveContract = false;
            let aftrVehicle = false;
            console.log(tx);
            for (let tag of tx.tags) {
                let key = tag.get("name", {decode: true, string: true});
                let value = tag.get('value', {decode: true, string: true});
                if (key === "App-Name" && value === "SmartWeaveContract") {
                    smartweaveContract = true;
                }
                if (key === "Protocol" && value === import.meta.env.VITE_SMARTWEAVE_TAG_PROTOCOL) {
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

            return txType;
        },
        async findIdType(id) {
            const arweave = arweaveInit();
            let txType = "";
            if (this.network === "DEV") {
                try {
                    const route = this.routeProtocol + "://" + this.routeHost + ":" + this.routePort + "/tx/" + id;
                    let response = await fetch(route).then(res=> res.json());
                    console.log(JSON.stringify(response));
                    txType = this.parseTags(response);
                } catch(e) {
                    console.log("ERROR when getting the tx. " + e);
                    txType = "UNSURE";
                }
            } else {
                const route = `https://gateway.redstone.finance/gateway/contract?txId=${id}${this.network === "TEST" ? "&testnet=true" : ""}`;
                let response = await fetch(route);
                if (!response.ok) {
                    txType = "UNSURE";
                } else {
                    const data = await response.json();
                    if (data.contractTx == null || data.contractTx.tags == null) {
                        // Can't see tags b/c tx wasn't uploaded using bundlr, now check srcTxId to see if AFTR
                        if (data.srcTxId && data.srcTxId != "" && data.srcTxId != null && data.srcTxId != undefined) {
                            if (this.aftrContractSrcs.includes(data.srcTxId)) {
                                aftrVehicle = true;
                                txType = "AFTR Vehicle";
                                return txType;
                            }
                        }
                        txType = "UNSURE";
                    } else {
                        txType = this.parseTags(data.contractTx);
                    }
                }
            }

            if (txType !== "UNSURE") {
                return txType;
            }

            // Test for address
            try {
                const balance = await arweave.wallets.getBalance(id);
                let winston = balance;
                let ar = arweave.ar.winstonToAr(balance);
            
                if (Number(ar) > 0) {
                    txType = "Address";
                } else {
                    txType = "Unknown - could be a wallet address with 0 AR";
                }
            } catch(e) {
                console.log("ERROR when getting balance. " + e);
            }

            return txType;
        }
    },
}
</script>