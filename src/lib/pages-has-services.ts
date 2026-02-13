import { IPage } from "@/store/pages";

export const pagesHasServices = (pagesData: IPage[] | null) =>    
        pagesData && pagesData.length > 0
          ? pagesData.some(
              (page: IPage) =>
                page.components &&
                page.components.some(
                  (component) =>
                    component.service && component.service !== "admin"
                )
            )
          : false;