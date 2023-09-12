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
        <div><button @click="buttonInteraction" class="btn mt-2">View Interactions</button></div>
        <div><button @click="getContractsFromSource" class="btn mt-2">Get Contracts From Source</button></div>
        <div><button @click="buttonPress2" class="btn mt-2">2. Create Contract</button></div>
        <div>Contract ID: {{ contractId }}</div>
        <div>Contract Source ID: {{ contractSrcId }}</div>
        <div>New Source ID: {{ newSrcId }}</div>
        <div><button @click="buttonPress3" class="btn mt-2">3. Add New Source</button></div>
        <div class="pt-2 pb-2">
            <textarea v-model="queryInput" class="textarea textarea-bordered" placeholder="Enter Query" rows="10" cols="100">
            </textarea>
        </div>
        <div class="flex flex-col-1">
            <input v-model="depTokenId" type="text" placeholder="Enter Depositing Token ID" class="input input-bordered w-96" />
            <input v-model="repoId" type="text" placeholder="Enter Repo ID" class="input input-bordered w-96" />
            <input v-model="depQty" type="text" placeholder="Qty" class="input input-bordered" />
            <button @click="buttonDeposit" class="btn mt-2">Test Deposit</button>
        </div>
        <div><button @click="buttonPress4" class="btn mt-2">4. Run Query</button></div>
        <div><button @click="buttonPress5" class="btn mt-2">5. Run Textarea</button></div>
        <div v-if="errorMsg !== ''"><label>{{ errorMsg }}</label></div>
        <div class="pt-4 w-full">
            <vue-json-pretty :path="'res'" :data="contractState" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
        </div>
    </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { arweaveInit, warpCreateContract, warpRead, warpWrite, warpCreateSource } from "./utils/warpUtils.js";
import Transaction from 'arweave/node/lib/transaction';
import contractSrc from "./../files/aftrContractSrcPlayground.js?raw";
import newContractSrc from "./../files/aftrContractSrc.js?raw";
//import newContractSrc from "./../files/playTokenSrc.js?raw";
//import newContractSrc from "./../files/playTokenSrcWithTestFunc.js?raw";
import initState from "./../files/aftrInitState.json?raw";
//import initState from "./../files/playTokenInitState.json?raw";
//import initState from "./../files/bravoInitState.json?raw";
//import initState from "./../files/playTokenInitStateTestFunc.json?raw";
import { createRepo, deposit } from "aftr-js";

const queryProtocol = "AFTR-PLAY";
// Play Counter Token ID:  EtB_GmTlI4lYz9t9hIFaDfdFotM8mK4eqM8QvPCSUOY

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
            depTokenId: "Wgkj_tFAZKQh-2Ke6_sOixSxTKOXukmdrcP9zd_PEwA",
            repoId: "6_FzWMZixdOEVr1Pyt3zw-sMKlB6OFit8cKWSiVlzKg",
            depQty: 3,
            tags: [],
            interactions: {},
            validities: {},

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
            console.log(JSON.stringify(result.state));
            this.contractState = result;
            this.contractSrcId = await this.getContractSourceId(this.contractId);
            this.findIdType(this.contractId);
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

            // indexedDB.databases().then(function(databases) {
            //     for (var i = 0; i < databases.length; i++) {
            //         console.log("Database name: " + databases[i].name);
            //     }
            // });

            // const request = window.indexedDB.open("level-js-./cache/warp/state", 1);
            // request.onsuccess = function(event) {
            //     const db = event.target.result;
            //     console.log("Object store names: " + JSON.stringify(db.objectStoreNames));

            //     const objectStore = db.transaction(["./cache/warp/state"], "readwrite").objectStore("./cache/warp/state");
            //     objectStore.clear();
            // };

            this.contractId = this.eContractId;
            //this.contractSrcId = await this.returnContractSrc(this.contractId);
            await this.readContract();
            await this.updateWalletBalance();
            //console.log(await this.findIdType(this.contractId));
            
        },
        async buttonInteraction() {
            if (this.eContractId === "") {
                alert("Please enter a Contract ID.");
                return;
            }
            let activities = [];
            const contract = await warpRead(this.eContractId, undefined, this.network);
            this.validities = contract.validity;
            this.interactions = await this.getInteractions(this.eContractId);
            // console.log(JSON.stringify(interactions));
            // this.contractState = this.interactions;
            for (const i of this.interactions) {
                let parsed = this.parseActivity(i.interaction);
                activities.push(parsed);
            }
            this.contractState = activities;
        },
        async getContractsFromSource() {
            const aftrSources = ["i0YyDgGDbdurVdbh3BHVq1tA7cu-kHQKptBLsGWdDkU", "drE3xaNRlex47dZZOEAos0t4W_LYU6AlHnQqVgXCAbw", "Y5jbLtKAUZna_If7ec0-LiQrkzMIfXq9dv08ncKJTt0", "ZoWzPJHkGQR6XFIzm5fVcRl8kJBCB-TnydjftvPfrNE", "ZltjnWSiHr04ETayUyJivkUAMTHBYbgo3C6BnwNsHmA", "tlqEtHxU3CJ5-eaCqvA6Hg0IYsra_Jl9atoeA28ox0I", "ZD-gAcaWEKE6Woe2BNrFXTljDOgrXXQXCBOutIfTgYo", "vZPaytXQvw4vrauZOztCCSbZoFo84a9JNDh2RF-OJ68", "3GzFtrEinxbUX9hjfgpcCLSdvstrK2ULehrorlkiPx8", "KWnNIDwOxzDm0BM2hkxibRlHwwvg_MVsIkmgchziyOw", "cqi_qZYI3wZX5aux32n11Me-vO9fI_m9L-0DRE9n0gs"];
            let activeAftrSources = [];
            for (let src of aftrSources) {
                const response = await fetch("https://gateway.warp.cc/gateway/contracts-by-source?id=" + src);
                if (response.status !== 200) {
                    throw response.status + " - " + response.statusText;
                }
                const data = await response.json();
                if (data.paging.items > 0) {
                    activeAftrSources.push({
                        "aftrSrc" : src,
                        "contracts" : data.paging.items
                    });
                }
            }
            this.contractState = activeAftrSources;
        },
        parseActivity(data) {
            // Parses the query response and returns an object with the needed variables
            let activity = {};
            activity.id = data.id;
            activity.owner = data.owner.address;
            activity.timestamp = data.block.timestamp;
            activity.block = data.block.height;
            activity.result = this.validities[activity.id];
            if (data.id === "GCgomdW53OKfTRgzgdGzsl-Y2GDky9-PNJ9udZIrvs4") {
                console.log(JSON.stringify(data));
            }

            // Parse Input tag to get the interaction specifics
            for (let tag of data.tags) {
                if (tag.name === "Input") {
                    activity.input = JSON.parse(tag.value);
                } else if (tag.name === "Contract") {
                    activity.contract = tag.value;
                }
            }
            return activity;
        },
        async buttonPress2first() {
            //this.reset();

            /*** WARP */
            // Deploy Sample AFTR Contract
            let txIds = await warpCreateContract(newContractSrc, initState, undefined, true, this.network);

            // Deploy regular PST
            //let txIds = await warpCreateContract(newContractSrc, initState, undefined, false, this.network);

            // Create contract from a source (just like a Repo)
            //let newSrcId = "i0YyDgGDbdurVdbh3BHVq1tA7cu-kHQKptBLsGWdDkU";
            //let txIds = await warpCreateFromTx(initState, newSrcId, undefined, true, this.network);
            this.contractId = txIds.contractTxId;

            await this.readContract();
            await this.updateWalletBalance();
        },
        async buttonPress2() {
            let repo = {
                name: "Event Controller Test",
                ticker: "ECONTROLTEST"
            };
            let response = await createRepo(repo, "use_wallet", undefined, this.network);
            if (response.status === "success") {
                alert("NEW REPO: " + response.data);
            } else {
                alert("ERROR: " + response.message);
            }
        },
        async buttonDeposit() {
            if (this.depTokenId === "" || this.depQty === "" || this.repoId === "") {
                alert("Invalid Input!");
                return;
            }
            let response = await deposit(this.repoId, this.depTokenId, Number(this.depQty), "use_wallet", this.network);
            if (response.status === "success") {
                alert("Deposit Successful: " + response.data.repoTxId + " & " + response.data.depTokenTxId);
            } else {
                alert("Deposit Failed: " + response.message);
            }
        },
        async buttonPress3() {
            this.newSrcId = await warpCreateSource(newContractSrc, this.network);
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
        async buttonPress5() {
            if (this.network == "") {
                alert("Please select a network.");
                return;
            }
            //this.reset();
            // let input = {
            //     function: 'propose',
            //     type: 'set',
            //     key: 'settings.custom1',
            //     value: "TEST"
            // };
            // let input = {
            //     function: 'balance',
            //     target: 'ewTkY6Mytg6C0AtYU6QlkEg1oH-9J2PPS0CM83RL9rk'
            // };
            // let input = {
            //     function: "mint",
            //     qty: 22
            // };
            // let input = {
            //     function: "finalize"
            // }

            /*
                {
                    "function": "propose",
                    "type" : "externalInteraction",
                    "target": "Wgkj_tFAZKQh-2Ke6_sOixSxTKOXukmdrcP9zd_PEwA",
                    "value": "{\"function\" : \"mint\", \"qty\": 22}"
                }
            */
            let input = JSON.parse(this.queryInput);
            console.log(input);
            
            //let tx = await warpDryWrite(this.eContractId, input, undefined, undefined, this.network);
            //let tx = await warpRead(this.eContractId, undefined, this.network);
            let tx = await warpWrite(this.eContractId, input, undefined, undefined, this.network);
            this.contractState = tx;
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
            for (let tag of tx.tags) {
                let key = tag.get("name", {decode: true, string: true});
                let value = tag.get('value', {decode: true, string: true});
                console.log("TAG: " + key + ": " + value);
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
        async getInteractions(contractId) {
            console.log(contractId);
            let route = 'https://gateway.redstone.finance/gateway/interactions?contractId=' + contractId + (this.network === 'TEST' ? '&testnet=true' : '');
            let response = await fetch(route)
            let data = await response.json()
            return data.interactions
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