import { EditablePropProps } from "@/types/editable-prop";
import { CSSProperties, ElementType } from "react";

interface HeadingRendererProps extends EditablePropProps {
    style?: CSSProperties;
    className?: string;
    text: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6; // Heading level
}

const HRenderer = ({
                             id,
                             label,
                             text,
                             style,
                             className,
                             level = 1, // h1 par défaut
                         }: HeadingRendererProps) => {
    const Tag: ElementType = `h${level}`;

    return (
        <Tag
            data-editable="true"
            data-id={id}
            data-label={label}
            style={style}
            className={className}
        >
            {text}
        </Tag>
    );
};

export default HRenderer;
