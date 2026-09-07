/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_QZ_TRAY_CERT: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
