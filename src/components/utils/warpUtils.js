import { DeployPlugin, InjectedArweaveSigner, ArweaveSigner } from 'warp-contracts-plugin-deploy';
import { WarpFactory, defaultCacheOptions } from "warp-contracts";
// import { SqliteContractCache } from 'warp-contracts-sqlite';
import Arweave, { init } from "arweave";
import axios from "axios";

function warpInit(env = "") {
    let warp = {};
    if (env === "") {
        env = import.meta.env.VITE_ENV;
    }

    try {
        // Using Warp
        if (env === "PROD") {
            // warp = WarpFactory.forMainnet().use(new DeployPlugin());
            warp = WarpFactory.forMainnet({ ...defaultCacheOptions, inMemory: true });
            // warp = WarpFactory.forMainnet({ ...defaultCacheOptions });
        } else if (env === "TEST") {
            warp = WarpFactory.forTestnet().use(new DeployPlugin());
        } else if (env === "DEV") {
            const arweave = arweaveInit();
            warp = WarpFactory.forLocal().use(new DeployPlugin());
        } else {
            warp = WarpFactory.forTestnet().use(new DeployPlugin());
        }
    } catch (e) {
        console.log(e);
    }
    return warp;
};

async function warpRead(contractId, internalWrites = true, env = "TEST", useSdk = false) {
    if (useSdk) {
        const warp = warpInit(env);

        try {
            const contract = warp.contract(contractId)
                .setEvaluationOptions({
                    allowBigInt: true,
                    internalWrites,
                    unsafeClient: "skip",
                    // remoteStateSyncEnabled: true,
                    //remoteStateSyncSource: "https://dre-5.warp.cc/contract"
                });
            const result = await contract.readState();
            return result;
        } catch (e) {
            console.log(e);
            return {};
        } finally {
            await warp.close();
        }
    } else {
        const dre = "https://dre-3.warp.cc";
        const dreUrl = `${dre}/contract?id=${contractId}`;
        let response = {};
    
        try {
            response = await axios.get(dreUrl);
            return response.data.state;
        } catch (e) {
            console.log(`ERROR FETCHING CONTRACT: ${e}`);
            return response;
        }
    }
};

async function warpWrite(contractId, input, internalWrites = true, bundling = true, env = "TEST") {
    const warp = warpInit(env);
    try {
        const contract = warp.contract(contractId)
            .setEvaluationOptions({
                internalWrites: internalWrites,
                disableBundling: !bundling,
                remoteStateSyncEnabled: true,
            })
            .connect("use_wallet");
        console.log(contract)
        const { originalTxId } = await contract.writeInteraction(input);
        return originalTxId;
    } catch (e) {
        console.log(e);
        return "";
    } finally {
        await warp.close();
    }
};

async function warpCreateContract(source, initState, currentTags = undefined, aftr = false, env = "TEST") {
    /*** 
     * Returns:
     * { contractTxId: string, srcTxId: string }
     */
    if (window.arweaveWallet) {
        await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION', 'ACCESS_PUBLIC_KEY', 'SIGNATURE']);
    }
    const userSigner = new InjectedArweaveSigner(window.arweaveWallet);
    await userSigner.setPublicKey();

    let tags = addTags(currentTags, aftr);
    const warp = warpInit(env);
    try {
        let txIds = await warp.deploy({
            wallet: userSigner,
            initState: initState,
            src: source,
            tags
        });
        console.log('TXIDS ::  ' + txIds)
        return txIds;
    } catch (e) {
        console.log("ERROR deploying AFTR contract: " + e);
        return {};
    } finally {
        await warp.close();
    }
};

async function warpCreateFromTx(initState, srcId, currentTags = undefined, aftr = false, env = "TEST") {
    /*** 
     * Returns:
     * { contractTxId: string, srcTxId: string }
     */
    if (window.arweaveWallet) {
        await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION', 'ACCESS_PUBLIC_KEY', 'SIGNATURE']);
    }
    const userSigner = new InjectedArweaveSigner(window.arweaveWallet);
    await userSigner.setPublicKey();

    let tags = addTags(currentTags, aftr);

    const warp = warpInit(env);
    try {
        let txIds = await warp.deployFromSourceTx({
            wallet: userSigner,
            initState: initState,
            srcTxId: srcId,
            tags
        });
        return txIds;
    } catch (e) {
        console.log("ERROR deploying AFTR contract: " + e);
        return {};
    } finally {
        await warp.close();
    }
};

async function warpCreateSource(newSrc, env = "TEST") {
    if (window.arweaveWallet) {
        await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION', 'ACCESS_PUBLIC_KEY', 'SIGNATURE']);
    }
    const userSigner = new InjectedArweaveSigner(window.arweaveWallet);
    await userSigner.setPublicKey();

    const warp = warpInit(env);

    try {
        const newSource = await warp.createSource( { src: newSrc }, new ArweaveSigner(window.arweaveWallet));
        console.log("CREATE");
        const newSrcId = await warp.saveSource(newSource);
        console.log("SAVE");
        return newSrcId;
    } catch(e) {
        console.log("ERROR saving source: " + e);
        return "";
    } finally {
        await warp.close();
    }
};

function arweaveInit() {
    const arweave = Arweave.init({
        host: import.meta.env.VITE_ARWEAVE_HOST,
        port: import.meta.env.VITE_ARWEAVE_PORT,
        protocol: import.meta.env.VITE_ARWEAVE_PROTOCOL,
        timeout: 20000,
        logging: true,
    });
    return arweave;
};

function addTags(currentTags, aftr = false) {
    let tags = [];
    if (currentTags) {
        tags = currentTags;
    }
    if (aftr) {
        tags.push({ name: "Protocol", value: import.meta.env.VITE_SMARTWEAVE_TAG_PROTOCOL });
        //tags.push({ name: "Implements", value: ["ANS-110"] });
        //tags.push({ name: "Type", value: ["aftr-repo"] });
    }

    return tags;
};

function readFile(file) {
    // Thanks to https://dilshankelsen.com/convert-file-to-byte-array/
    return new Promise((resolve, reject) => {
        // Create file reader
        let reader = new FileReader();

        // Register event listeners
        reader.addEventListener("loadend", e => resolve(e.target.result));
        reader.addEventListener("error", reject);

        // Read file
        reader.readAsArrayBuffer(file);
    });
};

async function getAsByteArray(file) {
    return new Uint8Array(await readFile(file));
};

async function upload(file) {
    const arweave = arweaveInit();

    const tx = await arweave.createTransaction({
        data: await getAsByteArray(file)
    }, "use_wallet");
    tx.addTag('Content-Type', file.type)
    await arweave.transactions.sign(tx)
    const res = await arweave.transactions.post(tx)
    if (!res.statusText == "OK") {
        throw new Error('Can not upload data')
    }

    return { file, assetId: tx.id }
};

async function dispatch(file) {
    const tx = await createAndTag(file)
    const result = await window.arweaveWallet.dispatch(tx)
    return { file, atomicId: result.id }
};

async function createAndTag(ctx) {
    const arweave = arweaveInit();

    const { assetId, name, addr, contentType, description } = ctx
    const tx = await arweave.createTransaction({
        data: JSON.stringify({
            manifest: "arweave/paths",
            version: "0.1.0",
            index: {
                path: "asset"
            },
            paths: {
                asset: {
                    id: assetId
                }
            }
        })
    }, "use_wallet")

    return tx
};

async function post(ctx) {
    const tx = await createAndTag(ctx)
    await arweave.transactions.sign(tx)
    tx.id = ctx.atomicId
    const result = await fetch(URL, {
        method: 'POST',
        body: JSON.stringify({ contractTx: tx }),
        headers: {
            'Accept-Encoding': 'gzip, deflate, br',
            'Content-Type': 'application/json',
            Accept: 'application/json'
        }
    })
    return { id: ctx.atomicId }
};


export { warpInit, warpRead, warpWrite, warpCreateContract, warpCreateFromTx, arweaveInit, upload, getAsByteArray, readFile, dispatch, post, warpCreateSource };