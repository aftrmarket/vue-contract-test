import { WarpFactory } from "warp-contracts/web";
import Arweave from "arweave";

function warpInit(env = "") {
    let warp = {};
    if (env === "") {
        env = import.meta.env.VITE_ENV;
    }
    try {
        // Using Warp
        if (env === "PROD") {
            warp = WarpFactory.forMainnet();
        } else if (env === "TEST") {
            warp = WarpFactory.forTestnet();
        } else if (env === "DEV") {
            warp = WarpFactory.forLocal();
        } else {
            warp = WarpFactory.forTestnet();
        }
    } catch(e) {
        console.log(e);
    }
    return warp;
};

async function warpRead(contractId, internalWrites = true, env = "") {
    const warp = warpInit(env);

    try {
        const contract = warp.contract(contractId)
            .setEvaluationOptions({ 
                internalWrites: internalWrites,
            });
        const result = await contract.readState();
        return result.cachedValue;
    } catch (e) {
        console.log(e);
        return {};
    }
};

async function warpWrite(contractId, input, internalWrites = true, bundling = false, env = "") {
    const warp = warpInit(env);
    try {
        const contract = warp.contract(contractId)
        .setEvaluationOptions({ 
            internalWrites: internalWrites,
            disableBundling: !bundling
         })
        .connect("use_wallet");
        const { originalTxId } = await contract.writeInteraction(input);
        //const result = await contract.dryWrite(input);
        return originalTxId;
        return result;
    } catch(e) {
        console.log(e);
        return "";
    }
};

async function warpCreateContract(source, initState, currentTags, aftr = false, env = "") {
    /*** 
     * Returns:
     * { contractTxId: string, srcTxId: string }
     */

    let tags = [];
    if (aftr) {
        tags = aftrTags(currentTags);
    }
    const warp = warpInit(env);
    try {
        let txIds = await warp.createContract.deploy({
            wallet: "use_wallet",
            initState: initState,
            src: source,
            tags
        });
        return txIds;
    } catch(e) {
        console.log("ERROR deploying AFTR contract: " + e);
        return {};
    }
};

async function warpCreateFromTx(initState, srcId, tags, env = "") {
    /*** 
     * Returns:
     * { contractTxId: string, srcTxId: string }
     */
    const warp = warpInit(env);
    try {
        let txIds = await warp.createContract.deployFromSourceTx({
            wallet: "use_wallet",
            initState: initState,
            srcTxId: srcId,
            tags
        });
        return txIds;
    } catch(e) {
        console.log("ERROR deploying AFTR contract: " + e);
        return {};
    }
};

async function warpSaveNewSource(contractId, newSource, env = "") {
    const warp = warpInit(env);
    try {
        //const newSrcTxId = await warp.contract.save({ src: newSource });

        const contract = warp.contract(contractId)
            .setEvaluationOptions({
                internalWrites: true
            })
            .connect("use_wallet");

        const newSrcTxId = await contract.save({ 
            src: newSource
        });
        return newSrcTxId;
    } catch(e) {
        console.log("ERROR saving new contract source: " + e);
        return "";
    }
    
};

async function warpEvolve(contractId, evolveSrcId, env = "") {
    const warp = warpInit(env);
    let contract = {};
    try {
        contract = warp.contract(contractId)
            .setEvaluationOptions({ internalWrites: true })
            .connect("use_wallet");
        } catch(e) {
            console.log("ERROR connecting contract: " + e);
            return "";
        }
    try {
        const result = await contract.evolve(evolveSrcId);
        return result;
    } catch(e) {
        console.log("ERROR evolving: " + e);
        return "";
    }
}

function arweaveInit(env = "") {
    let host = "";
    let port = "";
    let protocol = "";

    if (env === "DEV") {
        host = "localhost";
        port = "1984";
        protocol = "http";
    } else if (env === "TEST") {
        host = "arweave.net";
        port = "443";
        protocol = "https";
    } else if (env === "PROD") {
        host = "arweave.net";
        port = "443";
        protocol = "https";
    } else {
        host = import.meta.env.VITE_HOST;
        port = import.meta.env.VITE_PORT;
        protocol = import.meta.env.VITE_PROTOCOL;
    }

    const arweave = Arweave.init({
        host, port, protocol, 
        timeout: 2000, 
        logging: true,
    });
    return arweave;
};

function aftrTags(currentTags, aftr = false) {
    let tags = [];
    if (currentTags) {
        tags.push(currentTags);
    }
    tags.push( { name: "Protocol", value: import.meta.env.VITE_SMARTWEAVE_TAG_PROTOCOL } );
    tags.push( { name: "Implements", value: ["ANS-110"] });
    tags.push( { name: "Type", value: ["token", "vehicle"] } );

    return tags;
};

export { warpInit, warpRead, warpWrite, warpCreateContract, warpCreateFromTx, warpSaveNewSource, warpEvolve, arweaveInit };