import Fastify from "fastify";
import { readFile } from "node:fs/promises";

import { getRom, getRoms, login as rommLogin } from "./romm";
import {
    createShareAndUploadFiles,
    getFile,
    getShares,
    login as pingvinLogin
} from "./upload";

(async () => {
    const fastify = Fastify({
        logger: true,
        trustProxy: true
    });

    const INDEX = await readFile("index.html", "utf-8");

    const ROMM_USERNAME = process.env.ROMM_USERNAME;
    const ROMM_PASSWORD = process.env.ROMM_PASSWORD;
    const ROMM_HOST = process.env.ROMM_HOST;

    if (!ROMM_USERNAME || !ROMM_PASSWORD || !ROMM_HOST) {
        throw new Error(
            "ROMM_USERNAME, ROMM_PASSWORD, and ROMM_HOST must be provided"
        );
    }

    const PINGVIN_USERNAME = process.env.PINGVIN_USERNAME;
    const PINGVIN_PASSWORD = process.env.PINGVIN_PASSWORD;
    const PINGVIN_HOST = process.env.PINGVIN_HOST;

    if (!PINGVIN_USERNAME || !PINGVIN_PASSWORD || !PINGVIN_HOST) {
        throw new Error(
            "PINGVIN_USERNAME, PINGVIN_PASSWORD, and PINGVIN_HOST must be provided"
        );
    }

    const ROMM_ROOT = process.env.ROMM_ROOT;

    if (!ROMM_ROOT) {
        throw new Error("ROMM_ROOT must be provided");
    }

    const ROMM_CTX = await rommLogin(ROMM_HOST, ROMM_USERNAME, ROMM_PASSWORD);
    const PINGVIN_CTX = await pingvinLogin(
        PINGVIN_HOST,
        PINGVIN_USERNAME,
        PINGVIN_PASSWORD
    );

    let activeDownloads: {
        [id: number]: {
            shareData?: {
                pingvinShareUrl: string | null;
                pingvinExpiry: string | null;
            };

            uploadData?: {
                files: {
                    [name: string]: {
                        progress: number;
                    };
                };
            };

            error?: {
                message: string;
            };
        };
    } = {};

    for (const share of await getShares(PINGVIN_CTX)) {
        if (share.id.startsWith("romm-upload-")) {
            const id = parseInt(share.id.slice("romm-upload-".length));

            activeDownloads[id] = {
                shareData: {
                    pingvinShareUrl: PINGVIN_HOST + "/s/" + share.id,
                    pingvinExpiry: share.expiration
                }
            };
        } else {
            console.log("Unknown share", share.id);
        }
    }

    fastify.get("/", async (request, reply) => {
        reply.type("text/html").code(200);
        return INDEX;
    });

    fastify.get("/api/roms", async (request, reply) => await getRoms(ROMM_CTX));

    fastify.post("/api/beginDownload", async (request, reply) => {
        const { id } = request.body as { id: number };

        console.log("downloading rom", id);

        const rom = await getRom(ROMM_CTX, id);

        activeDownloads[id] = {
            uploadData: {
                files: {}
            }
        };

        const path = ROMM_ROOT + "/" + rom.full_path;

        console.log(path);

        createShareAndUploadFiles(
            PINGVIN_CTX,
            {
                name: rom.name,
                expiration: "4-days",
                id: `romm-upload-${id}`
            },
            await getFile(
                PINGVIN_CTX.chunkSize,
                path,
                (name, progress) => {
                    if (activeDownloads[id].uploadData) {
                        activeDownloads[id].uploadData.files[name] = {
                            progress
                        };
                    }
                },
                path
            )
        )
            .then((share) => {
                activeDownloads[id] = {
                    shareData: {
                        pingvinShareUrl: PINGVIN_HOST + "/s/" + share.id,
                        pingvinExpiry: share.expiration
                    }
                };
            })
            .catch((e) => {
                console.error(e);
                activeDownloads[id] = {
                    error: {
                        message: e.message
                    }
                };
            });

        return { success: true };
    });

    fastify.get("/api/downloadStatus", async (request, reply) => {
        const { id } = request.query as { id: number };
        return {
            state: activeDownloads[id]
        };
    });

    const start = async () => {
        try {
            await fastify.listen({ port: 3000 });
        } catch (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    };
    start();
})();
