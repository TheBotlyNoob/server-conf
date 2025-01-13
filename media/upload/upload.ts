import fs, { ReadStream } from "node:fs";
import process, { config } from "node:process";
import path from "node:path";

export interface ShareData {
    id: string;
    name: string | null;
    expiration: string;
    description: string | null;
    size: number;
    views: number;
    createdAt: string;
    recipients: string[];
    files: {
        id: string;
        name: string;
        size: string;
    }[];
    security: {
        passwordProtected: boolean;
    };
}

interface ServerConfig {
    host: string;

    // TODO: handle refresh token, too
    accessToken: string;

    shareIdLength: number;

    /* bytes */
    maxSize: number;
    chunkSize: number;

    allowsPassword: boolean;

    username: string;
    password: string;
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

export async function login(
    serverUrl: string,
    username: string,
    password: string
) {
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

    if (!allowsPassword) {
        throw new Error("Password login is disabled");
    }

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
        console.error("error response:", await signIn.text());
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
        allowsPassword,

        username,
        password
    };
}

async function checkIdAvailability(
    config: ServerConfig,
    id: string,
    retry?: boolean
) {
    const response = await authenticatedFetch(
        config,
        config.host + "/api/shares/isShareIdAvailable/" + id
    );

    if (!response.ok) {
        console.error("error response:", await response.text());

        if ((response.status === 403 || response.status === 401) && !retry) {
            console.log("retrying");
            // attempt to re-login and retry
            const newConfig = await login(
                config.host,
                config.username,
                config.password
            );

            config.accessToken = newConfig.accessToken;

            return checkIdAvailability(config, id, true);
        }

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
    },
    retry?: boolean
) {
    console.log("creating share", meta);

    let allowRegenerateId = false;

    const genId = () => {
        if (!allowRegenerateId) {
            throw new Error("ID is not available");
        }
        let id = "";
        for (let i = 0; i < config.shareIdLength; i++) {
            id += Math.floor(Math.random() * 16).toString(16);
        }
        return id;
    };

    if (!meta.id) {
        allowRegenerateId = true;
        meta.id = genId();
    }

    let isAvailable: boolean;

    do {
        isAvailable = await checkIdAvailability(config, meta.id);

        console.log("id availability", isAvailable);

        if (!isAvailable && !allowRegenerateId) {
            throw new Error("ID is not available");
        } else if (!isAvailable && allowRegenerateId) {
            meta.id = genId();

            console.log("regenerating id", meta.id);
        }
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
        console.error("error response:", await response.text());

        if ((response.status === 403 || response.status === 401) && !retry) {
            console.log("retrying");
            // attempt to re-login and retry
            const newConfig = await login(
                config.host,
                config.username,
                config.password
            );

            config.accessToken = newConfig.accessToken;

            return createShare(config, meta, true);
        } else {
            throw new Error("Failed to create share");
        }
    }

    return meta.id;
}

async function handleChunk(
    config: ServerConfig,
    shareId: string,
    chunkIndex: number,
    totalChunks: number,
    chunk: {
        name: string;
        data: Uint8Array;
    },
    fileId?: string | null,
    retry?: boolean
) {
    console.log("uploading chunk", chunkIndex, "of", totalChunks);
    console.log("fileid:", fileId);

    const searchParams = new URLSearchParams({
        chunkIndex: chunkIndex.toString(),
        totalChunks: totalChunks.toString(),

        name: chunk.name
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
            body: chunk.data
        }
    );

    if (!response.ok) {
        console.log(
            "error response:",
            await response.text(),
            "file:",
            chunk.name
        );

        if ((response.status === 403 || response.status === 401) && !retry) {
            console.log("retrying");
            // attempt to re-login and retry
            const newConfig = await login(
                config.host,
                config.username,
                config.password
            );

            config.accessToken = newConfig.accessToken;

            return handleChunk(
                config,
                shareId,
                chunkIndex,
                totalChunks,
                chunk,
                fileId,
                true
            );
        } else {
            throw new Error("Failed to upload file");
        }
    }

    const json = await response.json();

    console.log(json);

    return json.id as string;
}

const MAX_PARALLEL_FILES = 4;

async function uploadFile(
    config: ServerConfig,
    shareId: string,
    file: {
        name: string;
        data: ReadStream;
        byteLength: number;
    },

    onProgress: (progress: number) => void
) {
    if (file.byteLength > config.maxSize) {
        throw new Error("File too large");
    }

    if (file.byteLength === 0) {
        await handleChunk(config, shareId, 0, 1, {
            name: file.name,
            data: new Uint8Array(0)
        });
        return;
    }

    const chunks = Math.ceil(file.byteLength / config.chunkSize);
    let chunkIndex = 0;

    let chunkInFlight = false;

    let finishedPromiseRes: (value: void) => void;
    const finishedPromise = new Promise<void>((res) => {
        finishedPromiseRes = res;
    });

    let fileId: string | null = null;

    const readData = () => {
        console.log("readData called");

        if (chunkInFlight) {
            return;
        }
        chunkInFlight = true;

        const chunk: Buffer | null = file.data.read(config.chunkSize);

        console.log("chunk", chunk);

        if (!chunk) {
            chunkInFlight = false;
            return;
        }

        console.log("got chunk", chunk.length);

        console.log(chunk.length);

        if (chunk.length === config.chunkSize || chunkIndex === chunks - 1) {
            const currentChunkIndex = chunkIndex;
            chunkIndex++;

            console.log(
                "uploading chunk",
                currentChunkIndex,
                "total chunks:",
                chunks
            );

            const promise = handleChunk(
                config,
                shareId,
                currentChunkIndex,
                chunks,
                {
                    name: file.name,
                    data: chunk
                },
                fileId
            );

            (async () => {
                fileId = await promise;
                console.log("fileId", fileId);

                onProgress(chunkIndex / chunks);

                chunkInFlight = false;

                if (chunkIndex === chunks) {
                    finishedPromiseRes();
                } else {
                    readData();
                }
            })();
        } else {
            throw new Error("Invalid chunk size");
        }
    };

    file.data.on("readable", readData);

    await new Promise((res) => {
        file.data.on("end", res);
    });

    await finishedPromise;

    console.log("all chunks read", file.name);

    return fileId;
}

async function completeShare(
    config: ServerConfig,
    id: string,
    retry?: boolean
) {
    const response = await authenticatedFetch(
        config,
        config.host + "/api/shares/" + id + "/complete",
        {
            method: "POST"
        }
    );

    if (!response.ok) {
        console.error("error response:", await response.text());
        if ((response.status === 403 || response.status === 401) && !retry) {
            console.log("retrying");
            // attempt to re-login and retry
            const newConfig = await login(
                config.host,
                config.username,
                config.password
            );

            config.accessToken = newConfig.accessToken;

            return completeShare(config, id, true);
        } else {
            throw new Error("Failed to complete share");
        }
    }

    return response.json() as Promise<{
        id: string;
        name: string;
        expiration: string;
        description: string;
    }>;
}

export async function createShareAndUploadFiles(
    config: ServerConfig,
    shareMeta: {
        expiration: string;
        name: string;
        id?: string;
    },
    files: {
        name: string;
        data: ReadStream;
        byteLength: number;

        onProgress?: (progress: number) => void;
    }[]
) {
    const shareId = await createShare(config, shareMeta);

    console.log("created share", shareId);

    let inFlightFiles: Promise<void>[] = [];

    for (const file of files) {
        console.log("uploading", file.name);

        if (inFlightFiles.length === MAX_PARALLEL_FILES) {
            await inFlightFiles[0];
            inFlightFiles = inFlightFiles.slice(1);
        }
        inFlightFiles.push(
            uploadFile(config, shareId, file, (progress) => {
                console.log("progress", progress * 100);
                file.onProgress?.(progress);
            }) as Promise<void>
        );

        console.log("upload complete");
    }

    await Promise.all(inFlightFiles);

    console.log("completing share");

    const shareData = await completeShare(config, shareId);

    console.log("share complete");

    console.log("find the files at: " + config.host + "/s/" + shareId);

    return shareData;
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

    await createShareAndUploadFiles(
        config,
        {
            name: shareName,
            expiration: "4-days"
        },
        (
            await Promise.all(
                fileNames.map((f) => getFile(config.chunkSize, f))
            )
        ).flat()
    );
}

export async function getFile(
    chunkSize: number,
    filePath: string,
    onProgress?: (fileName: string, progress: number) => void,
    root?: string
): Promise<
    {
        onProgress?: (progress: number) => void;

        name: string;
        data: ReadStream;
        byteLength: number;
    }[]
> {
    filePath = path.resolve(filePath);

    const stats = await fs.promises.stat(filePath);

    if (stats.isSymbolicLink()) {
        throw new Error("Symbolic links are not supported");
    }

    if (stats.isDirectory()) {
        // follow through
        return (
            await Promise.all(
                (
                    await fs.promises.readdir(filePath)
                ).map((f) =>
                    getFile(
                        chunkSize,
                        path.join(filePath, f),
                        onProgress,
                        root ?? path.dirname(filePath)
                    )
                )
            )
        ).flat();
    } else {
        const name = root
            ? path.relative(root, filePath)
            : path.basename(filePath);
        return [
            {
                name,
                data: fs.createReadStream(filePath, {
                    highWaterMark: chunkSize * 2
                }),
                byteLength: stats.size,

                onProgress: onProgress
                    ? (progress) => onProgress(name, progress)
                    : undefined
            }
        ];
    }
}

export async function getShares(config: ServerConfig, retry?: boolean) {
    const response = await authenticatedFetch(
        config,
        config.host + "/api/shares"
    );

    if (!response.ok) {
        console.error("error response:", await response.text());

        if ((response.status === 403 || response.status === 401) && !retry) {
            console.log("retrying");
            // attempt to re-login and retry
            const newConfig = await login(
                config.host,
                config.username,
                config.password
            );

            config.accessToken = newConfig.accessToken;

            return getShares(config, true);
        } else {
            throw new Error("Failed to get shares");
        }
    }

    return await response.json().then((json) => json as ShareData[]);
}

if (require.main === module) {
    main();
}
