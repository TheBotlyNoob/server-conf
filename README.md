# server-confs

The docker compose configurations for my extremely hacky and messy server setup.

## What's in here?

The VPS (from here on referred to as president) runs on an Oracle Cloud Free Tier machine,
and is pretty much only used for exposing the services I run on my local machine to the internet.

On the VPS, I have the following services running:

-   [x] Traefik
-   [x] Watchtower
-   [x] Authentik
-   [x] Headscale
-   [x] Exit node for Headscale
-   [x] frps setup for hoisting local services
-   [x] Uptime Kuma
-   [x] Homepage that interfaces with the local services
-   [ ] Mattermost

On the local machine, I have the following services running:

-   [x] Traefik
-   [x] Watchtower
-   [x] frpc setup for accessing the local services from the internet
-   [x] qbittorrent (& gluetun)
-   [x] Jellyfin
-   [x]
-   [x] autobrr
-   [x] cross-seed
-   [x] Prowlarr
-   [x] Sonarr
-   [x] Radarr
