import { promises as fs } from "node:fs";
import process from "node:process";

interface ServerConfig {
    host: string;

    // TODO: handle refresh token, too
    accessToken: string;

    shareIdLength: number;

    /* bytes */
    maxSize: number;
    chunkSize: number;

    allowsPassword: boolean;
}

interface RawConfig {
    props: {
        pageProps: {
            configVariables: {
                key: string;
                value: string;
                type: string;
            }[];
        };
    };
}

async function authenticatedFetch(
    config: ServerConfig,
    url: string,
    options: RequestInit = {}
) {
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Cookie: `access_token=${config.accessToken}`
        }
    });
}

async function login(serverUrl: string, username: string, password: string) {
    const config = await fetch(serverUrl + "/auth/signIn");

    if (!config.ok) {
        throw new Error("Failed to fetch config");
    }

    // find whats in the <script id="__NEXT_DATA__" type="application/json"> tag
    const html = await config.text();

    const match = html.match(
        /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/
    )?.[1];

    if (!match) {
        throw new Error("Failed to parse config");
    }

    const json: RawConfig = JSON.parse(match);

    const configVariables = json.props.pageProps.configVariables;

    const shareIdLength = parseInt(
        configVariables.find((v) => v.key === "share.shareIdLength")?.value ??
            "8"
    );

    const maxSize = parseInt(
        configVariables.find((v) => v.key === "share.maxSize")?.value ??
            "1000000000"
    );
    const chunkSize = parseInt(
        configVariables.find((v) => v.key === "share.chunkSize")?.value ??
            "10000000"
    );

    const allowsPassword =
        (configVariables.find((v) => v.key === "oauth.disablePassword")
            ?.value ?? "false") === "false";

    const signIn = await fetch(serverUrl + "/api/auth/signIn", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            username,
            password
        })
    });

    if (!signIn.ok) {
        console.log("response:", await signIn.text());
        throw new Error("Failed to sign in");
    }

    const accessToken: string = await signIn
        .json()
        .then((json) => json.accessToken);

    return {
        host: serverUrl,
        accessToken,
        shareIdLength,
        maxSize,
        chunkSize,
        allowsPassword
    };
}

async function checkIdAvailability(config: ServerConfig, id: string) {
    const response = await authenticatedFetch(
        config,
        config.host + "/api/shares/isShareIdAvailable/" + id
    );

    if (!response.ok) {
        throw new Error("Failed to check id availability");
    }

    return await response.json().then((json) => json.isAvailable as boolean);
}

async function createShare(
    config: ServerConfig,
    meta: {
        id?: string;
        expiration: string;
        name: string;
    }
) {
    console.log("creating share", meta);

    let allowRegenerateId = false;
    if (!meta.id) {
        allowRegenerateId = true;
        // generate random id
        meta.id = "";
        for (let i = 0; i < config.shareIdLength; i++) {
            meta.id += Math.floor(Math.random() * 16).toString(16);
        }
    }

    let isAvailable: boolean;

    do {
        isAvailable = await checkIdAvailability(config, meta.id);

        if (!isAvailable && !allowRegenerateId) {
            throw new Error("ID is not available");
        }

        meta.id = "";
        for (let i = 0; i < config.shareIdLength; i++) {
            meta.id += Math.floor(Math.random() * 16).toString(16);
        }

        console.log("regenerating id", meta.id);
    } while (!isAvailable && allowRegenerateId);

    console.log("using id", meta.id);

    const response = await authenticatedFetch(
        config,
        config.host + "/api/shares",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: meta.id,
                name: meta.name,
                // now + 4 days
                expiration: meta.expiration,
                recipients: [],
                security: {}
            })
        }
    );

    if (!response.ok) {
        throw new Error("Failed to create share");
    }

    return meta.id;
}

async function uploadFile(
    config: ServerConfig,
    shareId: string,
    file: Uint8Array,
    fileName: string,

    onProgress: (progress: number) => void
) {
    const chunks = Math.ceil(file.byteLength / config.chunkSize);

    let fileId: string | null = null;

    for (let i = 0; i < chunks; i++) {
        const searchParams = new URLSearchParams({
            chunkIndex: i.toString(),
            totalChunks: chunks.toString(),

            name: fileName
        });

        if (fileId) {
            searchParams.append("id", fileId);
        }

        const response = await authenticatedFetch(
            config,
            config.host + "/api/shares/" + shareId + "/files?" + searchParams,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/octet-stream"
                },
                body: file.slice(
                    i * config.chunkSize,
                    Math.min((i + 1) * config.chunkSize, file.byteLength)
                )
            }
        );

        if (!response.ok) {
            throw new Error("Failed to upload file");
        }

        fileId = await response.json().then((json) => json.id);

        onProgress((i + 1) / chunks);
    }

    return fileId;
}

async function completeShare(config: ServerConfig, id: string) {
    const response = await authenticatedFetch(
        config,
        config.host + "/api/shares/" + id + "/complete",
        {
            method: "POST"
        }
    );

    if (!response.ok) {
        throw new Error("Failed to complete share");
    }
}

async function main() {
    const url: string | null = process.argv[2];
    const username: string | null = process.argv[3];
    const password: string | null = process.argv[4];
    const shareName: string | null = process.argv[5];

    const fileNames: string[] = process.argv.slice(6);

    if (
        !url ||
        !username ||
        !password ||
        !shareName ||
        fileNames.length === 0
    ) {
        console.log(
            "Usage: ts-node upload.ts <url> <username> <password> <sharename> <file1> <file2> ..."
        );
        process.exit(1);
    }

    console.log("logging in");

    const config = await login(url, username, password);

    console.log("logged in");

    const shareId = await createShare(config, {
        expiration: "4-days",
        name: shareName
    });

    console.log("created share", shareId);

    for (const fileName of fileNames) {
        const file = await fs.readFile(fileName);

        console.log("uploading", fileName);

        await uploadFile(config, shareId, file, fileName, (progress) => {
            console.log("progress", progress * 100);
        });

        console.log("upload complete");
    }

    console.log("completing share");

    await completeShare(config, shareId);

    console.log("share complete");

    console.log("find the files at: " + config.host + "/s/" + shareId);
}

main();
