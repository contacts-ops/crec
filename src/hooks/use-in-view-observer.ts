import { useEffect, useState, RefObject } from "react";

export const useInViewObserver = (ref: RefObject<HTMLElement>, threshold = 0.2) => {
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                }
            },
            { threshold }
        );

        const current = ref.current;
        if (current) observer.observe(current);

        return () => {
            if (current) observer.unobserve(current);
        };
    }, [ref, threshold]);

    return isInView;
};
