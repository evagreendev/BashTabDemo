declare global {
    type Terminal = typeof import("@xterm/xterm").Terminal;
    const Terminal: Terminal;

    namespace FitAddon {
        type FitAddon = typeof import("@xterm/addon-fit").FitAddon;
        const FitAddon: FitAddon;
    }

    namespace Unicode11Addon {
        type Unicode11Addon = typeof import("@xterm/addon-unicode11").Unicode11Addon;
        const Unicode11Addon: Unicode11Addon;
    }

    const V86: typeof import("v86").V86;


    interface Window {
        sendCmd: (cmd: str) => void;
        copyShareLink: () => void;
    }
}

export {};