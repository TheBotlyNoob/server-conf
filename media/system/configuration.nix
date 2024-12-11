{ config, pkgs, ... }: {
  imports = [
    ./hardware-configuration.nix
  ];

  boot.loader.grub.configurationLimit = 30;

  environment.systemPackages = with pkgs; [
    vim
    fish
    git
    dufs
    htop
    screen
    rclone
  ];

  services.qemuGuest.enable = true;
  services.spice-vdagentd.enable = true;

  users.users.server = {
    isNormalUser  = true;
    home  = "/home/server";
    extraGroups  = [ "wheel" "docker" ];
    uid = 1000;
  };

  users.groups.server.gid = 1000;

  virtualisation.docker.enable = true;

  networking.firewall = {
    enable = true;
    allowedTCPPorts = [ 7000 8080 ];
  };

  boot.tmp.cleanOnBoot = true;
  zramSwap.enable = true;
  networking.hostName = "sneakmaster-x";
  services.openssh.enable = true;
  system.stateVersion = "23.11";
}
