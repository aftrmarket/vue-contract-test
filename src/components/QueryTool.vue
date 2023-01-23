<template>
    <div class="m-4">
        <div class="flex flex-row gap-2">
            <input v-model="network" value="PROD" type="radio" name="radio-2" class="radio radio-primary" @change="networkSelect"/> <span class="label-text">Mainnet</span> 
            <input v-model="network" value="TEST" type="radio" name="radio-2" class="radio radio-primary" @change="networkSelect" /> <span class="label-text">Testnet</span>
            <input v-model="network" value="DEV" type="radio" name="radio-2" class="radio radio-primary" @change="networkSelect" /> <span class="label-text">Local</span>
        </div>
        <div class="mt-2">
            <input v-model="queryTimeout" type="text" placeholder="Timeout (ms)" class="input input-bordered w-96" />
        </div>
        <div class="pt-2 pb-2">
            


            <codemirror
                v-model="queryInput"
                placeholder="Enter GraphQL query..."
                :style="{ height: '400px' }"
                :autofocus="true"
                :indent-with-tab="true"
                :tab-size="4"
                :extensions="extensions"
            />


        </div>
        <div><button @click="buttonPress" class="btn mt-2">Run Query</button></div>
        <div v-if="errorMsg !== ''"><label>{{ errorMsg }}</label></div>
        <div class="pt-4 w-full">
            <vue-json-pretty :path="'res'" :data="queryResult" :showDoubleQuotes="false" :deep=3 :deepCollapseChildren="false" :showLength="true" :showSelectController="true"> </vue-json-pretty>
        </div>
    </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { arweaveInit } from "./utils/warpUtils.js";

import { Codemirror } from 'vue-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';


export default {
    components: { VueJsonPretty, Codemirror },
    data() {
        return {
            network: "TEST",
            errorMsg: "",
            queryResult: {},
            queryTimeout: 10000,
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

    methods: {
        networkSelect() {
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

        reset() {
            // this.eContractId = "";
            // this.contractId = "";
            // this.contractState = {};
            // this.contractSrcId = "";
            // this.newSrcId = "";
            // this.errorMsg = "";
        },

        async buttonPress() {
            if (this.network == "") {
                alert("Please select a network.");
                return;
            }
            if (this.queryInput == "") {
                alert("Please enter query.");
                return;
            }
            this.reset();
            const arweave = arweaveInit(this.network);
            const query = this.queryInput;
            let response = {};
            try {
                this.$swal({
                    icon: "info",
                    html: "Running query...",
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        this.$swal.showLoading()
                    },
                });
                response = await arweave.api.post("graphql", { query }, { timeout: this.queryTimeout });
                this.queryResult = response;
            } catch (e) {
                this.errorMsg = e;
            }
            this.$swal.close();

            // let psts = [
            //     // {
            //     //     contractId: "",
            //     //     tags: []
            //     // }
            // ];
            //const txs = response.data.data.transactions.edges;

            // for (let tx of txs) {
            //     psts.push(
            //         tx.node.id,
            //         tx.node.tags
            //     );
            // }

            // let cursor = "";
            // let hasNextPage = true;
            // let totalCount = 0;
            // this.queryInput = "";
            // while (hasNextPage) {
            //     let responseString = await this.runQuery(cursor);
            //     console.log(responseString);
            //     let respObj = JSON.parse(responseString);
            //     hasNextPage = respObj.data.data.transactions.pageInfo.hasNextPage;
            //     let txs = respObj.data.data.transactions.edges;
            //     for (let tx of txs) {
            //         psts.push(
            //             {
            //                 contractId: tx.node.id,
            //                 tags: tx.node.tags
            //             }
            //         );
            //         totalCount++;
            //         cursor = tx.cursor;
            //         this.queryInput += tx.node.id + "\n";
            //     }
            // }
            // alert("TOTAL: " + totalCount);
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
        }
    },
    setup() {
        //const code = ref(`console.log('Hello, world!')`)
        const extensions = [json(), oneDark]

        // Codemirror EditorView instance ref
        // const view = shallowRef()
        // const handleReady = (payload) => {
        //     view.value = payload.view
        // }

        // Status is available at all times via Codemirror EditorView
        // const getCodemirrorStates = () => {
        //     const state = view.value.state
        //     const ranges = state.selection.ranges
        //     const selected = ranges.reduce((r, range) => r + range.to - range.from, 0)
        //     const cursor = ranges[0].anchor
        //     const length = state.doc.length
        //     const lines = state.doc.lines
        //     // more state info ...
        //     // return ...
        // }

        return {
            // code,
            extensions,
            // handleReady,
            // log: console.log
        }
    }
}
</script>