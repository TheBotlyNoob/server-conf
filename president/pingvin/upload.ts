interface ServerConfig {
    host: string;

    // TODO: handle refresh token, too
    accessToken: string;

    shareIdLength: number;

    /* bits */
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

async function getConfig(serverUrl: URL, username: string, password: string) {
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
        configVariables.find((v) => v.key === "oauth.disablePassword")?.value ??
        "false" === "false";

    const signIn = await fetch(serverUrl + "/auth/signIn", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
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
        serverUrl,
        accessToken,
        shareIdLength,
        maxSize,
        chunkSize,
        allowsPassword
    };
}

async function uploadFile(config: ServerConfig, file: File, id?: string) {
    if (!id) {
        // generate random id
        id = "";
        for (let i = 0; i < config.shareIdLength; i++) {
            id += Math.floor(Math.random() * 16).toString(16);
        }
    }

    const response = await fetch(
        config.host + "/api/shares/isShareIdAvailable/"
    );
}
