export interface LoadedBande {
    Bande: React.ComponentType<Record<string, unknown>>;
    props: Record<string, unknown> & {
        siteId: string;
        primaryColor?: string;
        secondaryColor?: string;
        fontFamily?: string;
        secondaryFontFamily?: string;
    };
    id: string;
    originalId: string | undefined;
    name: string;
}   