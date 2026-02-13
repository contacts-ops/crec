
import { IPagePopulated } from "./models/types/populated";

export const homePageFromPages = (pages: IPagePopulated[]) => {
    return pages.find(
        (page: IPagePopulated) =>
            page.isHome === true ||
            page.slug === "/" ||
            page.slug === "home" ||
            page.slug === "" ||
            page.name?.toLowerCase().includes("accueil") ||
            page.name?.toLowerCase().includes("home")
    ) || pages[0];
}