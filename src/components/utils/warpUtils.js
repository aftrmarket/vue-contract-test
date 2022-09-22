import { WarpFactory } from "warp-contracts/web";

function warpInit(network = "local") {
    let warp = {};
    try {
        // Using Warp
        if (network === "mainnet") {
            warp = WarpFactory.forMainnet();
        } else if (network === "testnet") {
            warp = WarpFactory.forTestnet();
        } else if (network === "local") {
            warp = WarpFactory.forLocal();
        }
    } catch(e) {
        console.log(e);
    }
    return warp;
};

async function warpRead(warp, contractId) {
    try {
        const contract = warp.contract(contractId)
            .setEvaluationOptions({ 
                //allowUnsafeClient: true,
                internalWrites: true,
            });
        const result = await contract.readState();
        return result.cachedValue;
    } catch (e) {
        console.log(e);
        return {};
    }
};

async function warpWrite(warp, contractId ,input) {
    try {
        const contract = warp.contract(contractId)
        .setEvaluationOptions({ 
            //allowUnsafeClient: true,
            internalWrites: true,
         })
        .connect("use_wallet");
        const { originalTxId } = await contract.writeInteraction(input);
        return originalTxId;
    } catch(e) {
        console.log(e);
        return "";
    }
};


export { warpInit, warpRead, warpWrite };