<template>
    <div class="m-4">
        <div class="flex flex-row gap-2">
            <input v-model="network" value="PROD" type="radio" name="radio-2" class="radio radio-primary" @change="networkSelect"/> <span class="label-text">Mainnet</span> 
            <input v-model="network" value="TEST" type="radio" name="radio-2" class="radio radio-primary" @change="networkSelect" /> <span class="label-text">Testnet</span>
            <input v-model="network" value="DEV" type="radio" name="radio-2" class="radio radio-primary" @change="networkSelect" /> <span class="label-text">Local</span>
        </div>
        <div v-for="(tag, index) in tags" :key="index" class="mt-6 mb-4 grid grid-cols-4 gap-y-6 gap-x-4 sm:grid-cols-4 w-1/2">
            <label v-show="index == 0">Tag Name:</label>
            <label v-show="index == 0">Tag Value:</label>
            <label v-show="index == 0">Tag Filter:</label>
            <button v-show="index == 0" @click="addTag" class="btn">Add Tag</button>
            <input v-model="tag.name" type="text" placeholder="Type here" class="input input-bordered w-full max-w-xs" />
            <input v-model="tag.value" type="text" placeholder="Type here" class="input input-bordered w-full max-w-xs" />
            <select v-model="tag.filter" class="select select-bordered w-full max-w-xs">
                <option value="EQ">Equal</option>
                <option value="NEQ">Not Equal</option>
            </select>
            <button @click="removeTag(index)" class="btn">Remove Tag</button>
        </div>
        <button @click="generateQuery" class="btn">Generate Query</button>
        <button @click="runQuery" class="btn ml-4">Run Query</button>
        <div v-if="query" class="mt-6">
            {{ query }}
        </div>

        <div class="mt-4">
            <div v-for="id in txIds">
                <div>{{ id }}</div>
            </div>
        </div>
    </div>
</template>

<script>
import { arweaveInit, warpCreateContract, warpCreateFromTx, warpInit, warpRead, warpWrite, warpSaveNewSource, warpEvolve } from "./utils/warpUtils.js";

export default {
    data() {
        return {
            network: "PROD",
            tags: [
                { name: 'App-Name', value: 'SmartWeaveContract', filter: 'EQ' },
                { name: 'Warp-Testnet', value: "1.0.0", filter: 'NEQ'}
            ],
            queryTags: [],
            query: '',
            result: '',
            txIds: [],
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
    methods: {
        addTag() {
            this.tags.push({ name: '', value: '', filter: 'EQ' });
        },
        removeTag(index) {
            this.tags.splice(index, 1);
        },
        generateQuery() {
            let tagFilters = this.tags.map(tag => `{name: "${tag.name}", values: ["${tag.value}"], op: ${tag.filter}}`).join(', ');
            this.query = `
                query {
                transactions(tags: [${tagFilters}], first: 50) {
                    edges {
                        node {
                            id
                        }
                    }
                }
                }
            `;
        },
        async runQuery(cursor = "", pageLength = 100) {
            const arweave = arweaveInit(this.network);
            const query = this.query;
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

            // Format response
            let txIds = [];
            const respObj = JSON.parse(response);
            const edges = respObj.data.data.transactions.edges;
            for (let edge of edges) {
                txIds.push(edge.node.id);
            }
            this.txIds = txIds;
        },
    }
}
</script>