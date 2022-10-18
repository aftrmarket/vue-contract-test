import { WarpFactory } from "warp-contracts/web";
import Arweave from "arweave";

function warpInit() {
    let warp = {};
    try {
        // Using Warp
        if (import.meta.env.VITE_ENV === "PROD") {
            warp = WarpFactory.forMainnet();
        } else if (import.meta.env.VITE_ENV === "TEST") {
            warp = WarpFactory.forTestnet();
        } else if (import.meta.env.VITE_ENV === "DEV") {
            warp = WarpFactory.forLocal();
        } else {
            warp = WarpFactory.forTestnet();
        }
    } catch(e) {
        console.log(e);
    }
    return warp;
};

async function warpRead(contractId, internalWrites = true) {
    const warp = warpInit();

    try {
        const contract = warp.contract(contractId)
            .setEvaluationOptions({ 
                internalWrites: internalWrites,
            });
        const result = await contract.readState();
        console.log(typeof result);
        //return JSON.parse(result.cachedValue.state);
        return result.cachedValue;
    } catch (e) {
        console.log(e);
        return {};
    }
};

async function warpWrite(contractId, input, internalWrites = true, bundling = false) {
    const warp = warpInit();
    try {
        const contract = warp.contract(contractId)
        .setEvaluationOptions({ 
            internalWrites: internalWrites,
            disableBundling: !bundling
         })
        .connect("use_wallet");
        const { originalTxId } = await contract.writeInteraction(input);
        return originalTxId;
    } catch(e) {
        console.log(e);
        return "";
    }
};

async function warpCreateContract(source, initState, currentTags, aftr = false) {
    /*** 
     * Returns:
     * { contractTxId: string, srcTxId: string }
     */

    let tags = [];
    if (aftr) {
        tags = aftrTags(currentTags);
    }
    const warp = warpInit();
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

async function warpCreateFromTx(initState, srcId, tags) {
    /*** 
     * Returns:
     * { contractTxId: string, srcTxId: string }
     */
    const warp = warpInit();
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

function arweaveInit() {
    const arweave = Arweave.init({
        host: import.meta.env.VITE_HOST,
        port: import.meta.env.VITE_PORT,
        protocol: import.meta.env.VITE_PROTOCOL,
        timeout: 20000,
        logging: true,
    });
    return arweave;
};

function aftrTags(currentTags, aftr = false) {
    let tags = [];
    if (currentTags) {
        tags.push(currentTags);
    }
    tags.push( { name: "Protocol", value: "AFTR" } );
    tags.push( { name: "Implements", value: ["ANS-110"] });
    tags.push( { name: "Type", value: ["token", "vehicle"] } );

    return tags;
};

export { warpInit, warpRead, warpWrite, warpCreateContract, warpCreateFromTx, arweaveInit };