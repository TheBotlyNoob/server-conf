export interface RommSession {
    host: string;
    cookies: string;

    num_roms: number;
}

export interface RommRom {
    id: number;
    igdb_id: number;
    sgdb_id: number | null;
    moby_id: number | null;
    platform_id: number;
    platform_slug: string;
    platform_fs_slug: string;
    platform_name: string;
    platform_custom_name: string;
    platform_display_name: string;
    file_name: string;
    file_name_no_tags: string;
    file_name_no_ext: string;
    file_extension: string;
    file_path: string;
    file_size_bytes: number;
    name: string;
    slug: string;
    summary: string;
    first_release_date: number;
    youtube_video_id: string;
    average_rating: number;
    alternative_names: string[];
    genres: string[];
    franchises: string[];
    collections: string[];
    companies: string[];
    game_modes: string[];
    age_ratings: string[];
    igdb_metadata: {
        total_rating: string;
        aggregated_rating: string;
        first_release_date: number;
        youtube_video_id: string;
        genres: string[];
        franchises: string[];
        alternative_names: string[];
        collections: string[];
        companies: string[];
        game_modes: string[];
        age_ratings: {
            rating: string;
            category: string;
            rating_cover_url: string;
        }[];
        platforms: {
            igdb_id: number;
            name: string;
        }[];
        expansions: string[];
        dlcs: string[];
        remasters: string[];
        remakes: string[];
        expanded_games: string[];
        ports: {
            id: number;
            name: string;
            slug: string;
            type: string;
            cover_url: string;
        }[];
        similar_games: {
            id: number;
            name: string;
            slug: string;
            type: string;
            cover_url: string;
        }[];
    };
    moby_metadata: Record<string, never>;
    path_cover_s: string;
    path_cover_l: string;
    has_cover: boolean;
    url_cover: string;
    revision: string;
    regions: string[];
    languages: string[];
    tags: string[];
    multi: boolean;
    files: {
        filename: string;
        size: number;
        last_modified: string;
    }[];
    crc_hash: string;
    md5_hash: string;
    sha1_hash: string;
    full_path: string;
    created_at: string;
    updated_at: string;
    sibling_roms: string[];
    rom_user: {
        id: number;
        user_id: number;
        rom_id: number;
        created_at: string;
        updated_at: string;
        last_played: null;
        note_raw_markdown: string;
        note_is_public: boolean;
        is_main_sibling: boolean;
        backlogged: boolean;
        now_playing: boolean;
        hidden: boolean;
        rating: number;
        difficulty: number;
        completion: number;
        status: null;
        user__username: string;
    };
    sort_comparator: string;
}

export async function login(host: string, username: string, password: string) {
    const csrfToken = await fetch(host + "/api/heartbeat").then(
        (res) => res.headers.get("Set-Cookie")?.split(";")[0]
    );

    if (!csrfToken) {
        throw new Error("Failed to get CSRF token");
    }

    const resp = await fetch(host + "/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: csrfToken,
            "X-csrftoken": csrfToken.split("=")[1],
            authorization: "Basic " + btoa(username + ":" + password)
        },
        body: "{}"
    });

    if (!resp.ok) {
        console.log("response:", await resp.text());
        throw new Error("Failed to login");
    }

    console.log(await resp.json().then((d) => d.msg as string));

    const rommSession = resp.headers.get("Set-Cookie")?.split(";")[0];

    const cookies = csrfToken + "; " + rommSession;

    const num_roms = await fetch(host + "/api/stats").then((res) =>
        res.json().then((d) => d.ROMS as number)
    );

    return { host, cookies, num_roms };
}

export async function getRoms(ctx: RommSession) {
    const resp = await fetch(
        ctx.host + "/api/roms?order_by=id&order_dir=desc&limit=15",
        {
            headers: {
                Cookie: ctx.cookies
            }
        }
    );

    if (!resp.ok) {
        throw new Error("Failed to get ROMs");
    }

    return resp.json() as Promise<RommRom[]>;
}

export async function getRom(ctx: RommSession, id: number) {
    const resp = await fetch(ctx.host + "/api/roms/" + id, {
        headers: {
            Cookie: ctx.cookies
        }
    });

    if (!resp.ok) {
        console.log("response:", await resp.text());
        throw new Error("Failed to get ROM");
    }

    return resp.json() as Promise<RommRom>;
}

async function main() {
    const ctx = await login(
        // do the thing
        "",
        "",
        ""
    );

    console.log(ctx);

    const roms = await getRoms(ctx);

    console.log(roms);
}

if (require.main === module) {
    main();
}
